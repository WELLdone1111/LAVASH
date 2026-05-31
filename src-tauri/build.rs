fn main() {
    println!("cargo:rerun-if-changed=../dist");
    println!("cargo:rerun-if-changed=../index.html");
    println!("cargo:rerun-if-changed=../src/lavash-ui-build-id.ts");
    tauri_build::build()
}
