//! Локальне сховище секретів LAVASH (API-ключі, сесія Google).
//! Windows: `vault.enc` у `%LOCALAPPDATA%\LAVASH\secrets\`, шифрування DPAPI (лише цей Windows-користувач).
//! Інші ОС: записи в системному keyring (Keychain / Secret Service).

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

const VAULT_MAGIC: &[u8; 10] = b"LAVASHVLT1";
const VAULT_VERSION: u32 = 1;
const VAULT_FILENAME: &str = "vault.enc";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct VaultPayload {
    v: u32,
    entries: HashMap<String, String>,
}

fn app_secrets_dir() -> Result<PathBuf, String> {
    let base = app_data_root()?;
    let dir = base.join("secrets");
    fs::create_dir_all(&dir).map_err(|e| format!("secrets dir: {e}"))?;
    Ok(dir)
}

fn vault_file_path() -> Result<PathBuf, String> {
    Ok(app_secrets_dir()?.join(VAULT_FILENAME))
}

/// Той самий корінь, що й пресети: `%LOCALAPPDATA%\LAVASH\` (Windows).
fn app_data_root() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let base = std::env::var_os("LOCALAPPDATA")
            .ok_or_else(|| "LOCALAPPDATA не знайдено.".to_string())?;
        return Ok(PathBuf::from(base).join("lavash"));
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var_os("HOME").ok_or_else(|| "HOME не знайдено.".to_string())?;
        return Ok(
            PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("lavash"),
        );
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let home = std::env::var_os("HOME").ok_or_else(|| "HOME не знайдено.".to_string())?;
        let data_home = std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(home).join(".local").join("share"));
        Ok(data_home.join("lavash"))
    }
}

#[cfg(windows)]
mod platform {
    use super::*;

    pub fn protect(plain: &[u8]) -> Result<Vec<u8>, String> {
        use windows::core::PCWSTR;
        use windows::Win32::Foundation::{LocalFree, HLOCAL};
        use windows::Win32::Security::Cryptography::{
            CryptProtectData, CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN,
        };

        let mut plain_buf = plain.to_vec();
        let input = CRYPT_INTEGER_BLOB {
            cbData: plain_buf.len() as u32,
            pbData: plain_buf.as_mut_ptr(),
        };
        let mut output = CRYPT_INTEGER_BLOB::default();
        unsafe {
            CryptProtectData(
                &input,
                PCWSTR::null(),
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )
            .map_err(|e| format!("CryptProtectData: {e}"))?;
            let out =
                std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
            let _ = LocalFree(Some(HLOCAL(output.pbData as _)));
            Ok(out)
        }
    }

    pub fn unprotect(data: &[u8]) -> Result<Vec<u8>, String> {
        use windows::Win32::Foundation::{LocalFree, HLOCAL};
        use windows::Win32::Security::Cryptography::{
            CryptUnprotectData, CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN,
        };

        let mut data_buf = data.to_vec();
        let input = CRYPT_INTEGER_BLOB {
            cbData: data_buf.len() as u32,
            pbData: data_buf.as_mut_ptr(),
        };
        let mut output = CRYPT_INTEGER_BLOB::default();
        unsafe {
            CryptUnprotectData(
                &input,
                None,
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )
            .map_err(|e| format!("CryptUnprotectData: {e}"))?;
            let out =
                std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
            let _ = LocalFree(Some(HLOCAL(output.pbData as _)));
            Ok(out)
        }
    }

    fn read_payload() -> Result<VaultPayload, String> {
        let path = vault_file_path()?;
        let raw = match fs::read(&path) {
            Ok(b) => b,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(VaultPayload::default()),
            Err(e) => return Err(format!("read vault: {e}")),
        };
        if raw.len() < VAULT_MAGIC.len() + 4 {
            return Err("vault.enc: некоректний заголовок.".to_string());
        }
        if &raw[..VAULT_MAGIC.len()] != VAULT_MAGIC {
            return Err("vault.enc: невідомий формат.".to_string());
        }
        let cipher = &raw[VAULT_MAGIC.len()..];
        let plain = unprotect(cipher)?;
        let payload: VaultPayload = serde_json::from_slice(&plain)
            .map_err(|e| format!("vault JSON: {e}"))?;
        Ok(payload)
    }

    fn write_payload(payload: &VaultPayload) -> Result<(), String> {
        let json = serde_json::to_vec(payload).map_err(|e| format!("vault serialize: {e}"))?;
        let cipher = protect(&json)?;
        let mut out = Vec::with_capacity(VAULT_MAGIC.len() + cipher.len());
        out.extend_from_slice(VAULT_MAGIC);
        out.extend_from_slice(&cipher);
        let path = vault_file_path()?;
        fs::write(&path, &out).map_err(|e| format!("write vault: {e}"))?;
        Ok(())
    }

    pub fn get_secret(key: &str) -> Result<Option<String>, String> {
        let k = sanitize_key(key)?;
        let payload = read_payload()?;
        Ok(payload.entries.get(&k).cloned())
    }

    pub fn set_secret(key: &str, value: &str) -> Result<(), String> {
        let k = sanitize_key(key)?;
        let v = value.to_string();
        let mut payload = read_payload()?;
        if v.trim().is_empty() {
            payload.entries.remove(&k);
        } else {
            payload.entries.insert(k, v);
        }
        payload.v = VAULT_VERSION;
        write_payload(&payload)
    }

    pub fn delete_secret(key: &str) -> Result<(), String> {
        let k = sanitize_key(key)?;
        let mut payload = read_payload()?;
        payload.entries.remove(&k);
        write_payload(&payload)
    }

    pub fn clear_secrets() -> Result<(), String> {
        let path = vault_file_path()?;
        match fs::remove_file(&path) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(format!("remove vault: {e}")),
        }
    }

    pub fn list_keys() -> Result<Vec<String>, String> {
        let payload = read_payload()?;
        let mut keys: Vec<String> = payload.entries.keys().cloned().collect();
        keys.sort();
        Ok(keys)
    }

    pub fn vault_path_hint() -> Result<String, String> {
        Ok(vault_file_path()?
            .to_string_lossy()
            .to_string())
    }
}

#[cfg(not(windows))]
mod platform {
    use super::*;

    fn keyring_entry(key: &str) -> Result<keyring::Entry, String> {
        keyring::Entry::new("lavash", key).map_err(|e| e.to_string())
    }

    pub fn get_secret(key: &str) -> Result<Option<String>, String> {
        let k = sanitize_key(key)?;
        match keyring_entry(&k)?.get_password() {
            Ok(v) => Ok(Some(v)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn set_secret(key: &str, value: &str) -> Result<(), String> {
        let k = sanitize_key(key)?;
        if value.trim().is_empty() {
            return delete_secret(key);
        }
        keyring_entry(&k)?
            .set_password(value)
            .map_err(|e| e.to_string())
    }

    pub fn delete_secret(key: &str) -> Result<(), String> {
        let k = sanitize_key(key)?;
        match keyring_entry(&k)?.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn clear_secrets() -> Result<(), String> {
        let keys = list_keys()?;
        for k in keys {
            delete_secret(&k)?;
        }
        Ok(())
    }

    pub fn list_keys() -> Result<Vec<String>, String> {
        let _ = app_secrets_dir()?;
        Ok(Vec::new())
    }

    pub fn vault_path_hint() -> Result<String, String> {
        Ok(app_secrets_dir()?
            .join("keyring-entries")
            .to_string_lossy()
            .to_string())
    }
}

fn sanitize_key(raw: &str) -> Result<String, String> {
    let s: String = raw
        .trim()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '_' || *c == '-')
        .take(96)
        .collect();
    if s.is_empty() {
        Err("Порожній ключ сховища.".to_string())
    } else {
        Ok(s)
    }
}

pub fn get_secret(key: String) -> Result<Option<String>, String> {
    platform::get_secret(&key)
}

pub fn set_secret(key: String, value: String) -> Result<(), String> {
    platform::set_secret(&key, &value)
}

pub fn delete_secret(key: String) -> Result<(), String> {
    platform::delete_secret(&key)
}

pub fn clear_secrets() -> Result<(), String> {
    platform::clear_secrets()
}

pub fn list_secret_keys() -> Result<Vec<String>, String> {
    platform::list_keys()
}

pub fn vault_storage_path() -> Result<String, String> {
    platform::vault_path_hint()
}
