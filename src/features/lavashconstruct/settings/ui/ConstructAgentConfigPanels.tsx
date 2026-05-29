import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, Brain, FileText, Plus, RefreshCw, Settings2, Trash2, Zap } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { useProjectWorkspaceStore } from "@/features/lavashconstruct/project/model/projectWorkspaceStore";
import {
  AGENT_CONFIG_CHANGED_EVENT,
  addAgentCommand,
  addAgentMemory,
  addAgentRule,
  addAgentSkill,
  readAgentCommands,
  readAgentImportSettings,
  readAgentMemories,
  readAgentRules,
  readAgentSkills,
  readMemoriesFeatureEnabled,
  removeAgentCommand,
  removeAgentMemory,
  removeAgentRule,
  removeAgentSkill,
  setDiscoveredSkillEnabled,
  updateAgentCommand,
  updateAgentMemory,
  updateAgentRule,
  updateAgentSkill,
  writeAgentImportSettings,
  writeMemoriesFeatureEnabled,
  type AgentCommand,
  type AgentRule,
  type AgentScope,
  type AgentSkill,
} from "@/features/lavashconstruct/settings/model/constructAgentConfig";
import { scanDiscoveredAgentSkills } from "@/features/lavashconstruct/settings/model/constructAgentContext";
import {
  BasicsSettingsCard,
  BasicsSettingsRow,
  BasicsSettingsSection,
} from "@/features/lavashconstruct/settings/ui/ConstructBasicsSettings";
import { ConstructAgentSwitch } from "@/features/lavashconstruct/chat/ui/ConstructAgentToggle";
import "./ConstructBasicsSettings.css";

function useAgentRevision(): number {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const bump = () => setRevision((v) => v + 1);
    window.addEventListener(AGENT_CONFIG_CHANGED_EVENT, bump);
    return () => window.removeEventListener(AGENT_CONFIG_CHANGED_EVENT, bump);
  }, []);
  return revision;
}

function AgentScopeTabs(props: { scope: AgentScope; onChange: (scope: AgentScope) => void; projectOpen: boolean }) {
  const { t } = useI18n();
  return (
    <div className="lc-agent-tabs" role="tablist" aria-label={t("construct.model.agent.scopeTabsAria")}>
      <button
        type="button"
        role="tab"
        aria-selected={props.scope === "global"}
        className={cn("lc-agent-tabs__tab", props.scope === "global" && "lc-agent-tabs__tab--active")}
        onClick={() => props.onChange("global")}
      >
        {t("construct.model.agent.scopeGlobal")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={props.scope === "project"}
        disabled={!props.projectOpen}
        title={props.projectOpen ? undefined : t("construct.model.agent.scopeProjectDisabled")}
        className={cn("lc-agent-tabs__tab", props.scope === "project" && "lc-agent-tabs__tab--active")}
        onClick={() => props.onChange("project")}
      >
        {t("construct.model.agent.scopeProject")}
      </button>
    </div>
  );
}

function AgentSectionCard(props: { children: ReactNode }) {
  return <div className="lc-basics-settings__card lc-agent-card">{props.children}</div>;
}

function AgentEmptyState(props: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="lc-agent-empty">
      <div className="lc-agent-empty__icon">{props.icon}</div>
      <p className="lc-agent-empty__title">{props.title}</p>
      <p className="lc-agent-empty__hint">{props.hint}</p>
    </div>
  );
}

function AgentItemRow(props: {
  title: string;
  description?: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  onEdit: () => void;
  onRemove?: () => void;
  toggleLabel: string;
  readOnly?: boolean;
}) {
  return (
    <div className="lc-agent-item">
      <div className="lc-agent-item__main">
        <p className="lc-agent-item__title">{props.title}</p>
        {props.description ? <p className="lc-agent-item__desc">{props.description}</p> : null}
      </div>
      <div className="lc-agent-item__actions">
        <ConstructAgentSwitch
          id={`${props.title}-toggle`}
          checked={props.enabled}
          onChange={props.onToggle}
          label={props.toggleLabel}
        />
        {!props.readOnly ? (
          <>
            <button type="button" className="lc-agent-item__icon-btn" aria-label="Edit" onClick={props.onEdit}>
              <Settings2 size={14} strokeWidth={2} aria-hidden />
            </button>
            {props.onRemove ? (
              <button type="button" className="lc-agent-item__icon-btn lc-agent-item__icon-btn--danger" aria-label="Remove" onClick={props.onRemove}>
                <Trash2 size={14} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function ConstructAgentImportSettingsSection() {
  const { t } = useI18n();
  useAgentRevision();
  const settings = readAgentImportSettings();

  return (
    <BasicsSettingsSection title={t("construct.model.agent.importHeading")}>
      <BasicsSettingsCard>
        <BasicsSettingsRow
          label={t("construct.model.agent.importSkillsDir")}
          description={t("construct.model.agent.importSkillsDirDesc")}
        >
          <ConstructAgentSwitch
            id="lc-agent-import-skills-dir"
            checked={settings.agentsSkillsDir}
            onChange={(next) => writeAgentImportSettings({ ...settings, agentsSkillsDir: next })}
            label={t("construct.model.agent.importSkillsDir")}
          />
        </BasicsSettingsRow>
        <BasicsSettingsRow
          label={t("construct.model.agent.importAgentsMd")}
          description={t("construct.model.agent.importAgentsMdDesc")}
        >
          <ConstructAgentSwitch
            id="lc-agent-import-agents-md"
            checked={settings.agentsMd}
            onChange={(next) => writeAgentImportSettings({ ...settings, agentsMd: next })}
            label={t("construct.model.agent.importAgentsMd")}
          />
        </BasicsSettingsRow>
        <BasicsSettingsRow
          label={t("construct.model.agent.importClaudeMd")}
          description={t("construct.model.agent.importClaudeMdDesc")}
        >
          <ConstructAgentSwitch
            id="lc-agent-import-claude-md"
            checked={settings.claudeMd}
            onChange={(next) => writeAgentImportSettings({ ...settings, claudeMd: next })}
            label={t("construct.model.agent.importClaudeMd")}
          />
        </BasicsSettingsRow>
      </BasicsSettingsCard>
    </BasicsSettingsSection>
  );
}

function useProjectRoot(): string | null {
  return useProjectWorkspaceStore((s) => s.projectRoot);
}

function AgentItemsEditor(props: {
  nameLabel: string;
  nameValue: string;
  onNameChange: (v: string) => void;
  triggerLabel?: string;
  triggerValue?: string;
  onTriggerChange?: (v: string) => void;
  descLabel?: string;
  descValue?: string;
  onDescChange?: (v: string) => void;
  contentLabel: string;
  contentValue: string;
  onContentChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <form
      className="lc-agent-editor"
      onSubmit={(e) => {
        e.preventDefault();
        props.onSave();
      }}
    >
      <label className="lc-agent-editor__field">
        <span>{props.nameLabel}</span>
        <input value={props.nameValue} onChange={(e) => props.onNameChange(e.target.value)} spellCheck={false} />
      </label>
      {props.triggerLabel ? (
        <label className="lc-agent-editor__field">
          <span>{props.triggerLabel}</span>
          <input
            value={props.triggerValue ?? ""}
            onChange={(e) => props.onTriggerChange?.(e.target.value)}
            placeholder="debug"
            spellCheck={false}
          />
        </label>
      ) : null}
      {props.descLabel ? (
        <label className="lc-agent-editor__field">
          <span>{props.descLabel}</span>
          <input value={props.descValue ?? ""} onChange={(e) => props.onDescChange?.(e.target.value)} spellCheck={false} />
        </label>
      ) : null}
      <label className="lc-agent-editor__field">
        <span>{props.contentLabel}</span>
        <textarea value={props.contentValue} onChange={(e) => props.onContentChange(e.target.value)} rows={5} spellCheck={false} />
      </label>
      <div className="lc-agent-editor__actions">
        <button type="button" className="lc-agent-editor__cancel" onClick={props.onCancel}>
          {t("construct.model.manager.cancel")}
        </button>
        <button type="submit" className="lc-agent-editor__save" disabled={props.saveDisabled}>
          {t("construct.model.manager.saveCustom")}
        </button>
      </div>
    </form>
  );
}

export function ConstructAgentSkillsSection() {
  const { t } = useI18n();
  const revision = useAgentRevision();
  const projectRoot = useProjectRoot();
  const [scope, setScope] = useState<AgentScope>("global");
  const [discovered, setDiscovered] = useState<AgentSkill[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const refreshDiscovered = useCallback(async () => {
    const list = await scanDiscoveredAgentSkills();
    setDiscovered(list);
  }, []);

  useEffect(() => {
    void refreshDiscovered();
  }, [refreshDiscovered, revision, projectRoot]);

  const userSkills = useMemo(
    () => readAgentSkills(scope, projectRoot),
    [scope, projectRoot, revision],
  );

  const visibleSkills = useMemo(() => {
    if (scope === "project") {
      return [...discovered, ...userSkills];
    }
    return userSkills;
  }, [discovered, scope, userSkills]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setContent("");
    setCreating(false);
    setEditingId(null);
  };

  const startEdit = (skill: AgentSkill) => {
    if (skill.discovered) return;
    setEditingId(skill.id);
    setName(skill.name);
    setDescription(skill.description);
    setContent(skill.content);
    setCreating(false);
  };

  const save = () => {
    if (!name.trim() || !content.trim()) return;
    if (editingId) {
      updateAgentSkill(scope, projectRoot, editingId, { name, description, content });
    } else {
      addAgentSkill(scope, projectRoot, { name, description, content });
    }
    resetForm();
  };

  return (
    <BasicsSettingsSection
      title={t("construct.model.agent.skillsHeading")}
      action={
        <button
          type="button"
          className="lc-basics-settings__refresh"
          aria-label={t("construct.model.agent.refresh")}
          onClick={() => void refreshDiscovered()}
        >
          <RefreshCw size={14} strokeWidth={2} aria-hidden />
        </button>
      }
    >
      <AgentSectionCard>
        <div className="lc-agent-card__intro">
          <p className="lc-agent-card__lead">{t("construct.model.agent.skillsLead")}</p>
          <button type="button" className="lc-agent-card__create" onClick={() => { resetForm(); setCreating(true); }}>
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            {t("construct.model.agent.create")}
          </button>
        </div>
        <AgentScopeTabs scope={scope} onChange={setScope} projectOpen={Boolean(projectRoot)} />
        {creating ? (
          <AgentItemsEditor
            nameLabel={t("construct.model.agent.skillName")}
            nameValue={name}
            onNameChange={setName}
            descLabel={t("construct.model.agent.skillDesc")}
            descValue={description}
            onDescChange={setDescription}
            contentLabel={t("construct.model.agent.skillContent")}
            contentValue={content}
            onContentChange={setContent}
            onCancel={resetForm}
            onSave={save}
            saveDisabled={!name.trim() || !content.trim()}
          />
        ) : null}
        {visibleSkills.length === 0 ? (
          <AgentEmptyState
            icon={<BookOpen size={22} strokeWidth={1.75} aria-hidden />}
            title={t("construct.model.agent.skillsEmpty")}
            hint={t("construct.model.agent.skillsEmptyHint")}
          />
        ) : (
          <div className="lc-agent-item-list">
            {visibleSkills.map((skill) => (
              <div key={skill.id}>
                <AgentItemRow
                  title={skill.name}
                  description={skill.description || (skill.discovered ? t("construct.model.agent.discoveredSkill") : undefined)}
                  enabled={skill.enabled}
                  readOnly={skill.discovered}
                  toggleLabel={t("construct.model.agent.toggleSkill", { name: skill.name })}
                  onToggle={(next) => {
                    if (skill.discovered) setDiscoveredSkillEnabled(skill.id, next);
                    else updateAgentSkill(scope, projectRoot, skill.id, { enabled: next });
                  }}
                  onEdit={() => startEdit(skill)}
                  onRemove={skill.discovered ? undefined : () => removeAgentSkill(scope, projectRoot, skill.id)}
                />
                {editingId === skill.id ? (
                  <AgentItemsEditor
                    nameLabel={t("construct.model.agent.skillName")}
                    nameValue={name}
                    onNameChange={setName}
                    descLabel={t("construct.model.agent.skillDesc")}
                    descValue={description}
                    onDescChange={setDescription}
                    contentLabel={t("construct.model.agent.skillContent")}
                    contentValue={content}
                    onContentChange={setContent}
                    onCancel={resetForm}
                    onSave={save}
                    saveDisabled={!name.trim() || !content.trim()}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AgentSectionCard>
    </BasicsSettingsSection>
  );
}

export function ConstructAgentCommandsSection() {
  const { t } = useI18n();
  const revision = useAgentRevision();
  const projectRoot = useProjectRoot();
  const [scope, setScope] = useState<AgentScope>("global");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const commands = useMemo(() => readAgentCommands(scope, projectRoot), [scope, projectRoot, revision]);

  const resetForm = () => {
    setName("");
    setTrigger("");
    setDescription("");
    setContent("");
    setCreating(false);
    setEditingId(null);
  };

  const startEdit = (cmd: AgentCommand) => {
    setEditingId(cmd.id);
    setName(cmd.name);
    setTrigger(cmd.trigger);
    setDescription(cmd.description);
    setContent(cmd.content);
    setCreating(false);
  };

  const save = () => {
    if (!name.trim() || !trigger.trim() || !content.trim()) return;
    if (editingId) {
      updateAgentCommand(scope, projectRoot, editingId, { name, trigger, description, content });
    } else {
      addAgentCommand(scope, projectRoot, { name, trigger, description, content });
    }
    resetForm();
  };

  return (
    <BasicsSettingsSection title={t("construct.model.agent.commandsHeading")}>
      <AgentSectionCard>
        <div className="lc-agent-card__intro">
          <p className="lc-agent-card__lead">{t("construct.model.agent.commandsLead")}</p>
          <button type="button" className="lc-agent-card__create" onClick={() => { resetForm(); setCreating(true); }}>
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            {t("construct.model.agent.create")}
          </button>
        </div>
        <AgentScopeTabs scope={scope} onChange={setScope} projectOpen={Boolean(projectRoot)} />
        {creating ? (
          <AgentItemsEditor
            nameLabel={t("construct.model.agent.commandName")}
            nameValue={name}
            onNameChange={setName}
            triggerLabel={t("construct.model.agent.commandTrigger")}
            triggerValue={trigger}
            onTriggerChange={setTrigger}
            descLabel={t("construct.model.agent.commandDesc")}
            descValue={description}
            onDescChange={setDescription}
            contentLabel={t("construct.model.agent.commandContent")}
            contentValue={content}
            onContentChange={setContent}
            onCancel={resetForm}
            onSave={save}
            saveDisabled={!name.trim() || !trigger.trim() || !content.trim()}
          />
        ) : null}
        {commands.length === 0 ? (
          <AgentEmptyState
            icon={<Zap size={22} strokeWidth={1.75} aria-hidden />}
            title={t("construct.model.agent.commandsEmpty")}
            hint={t("construct.model.agent.commandsEmptyHint")}
          />
        ) : (
          <div className="lc-agent-item-list">
            {commands.map((cmd) => (
              <div key={cmd.id}>
                <AgentItemRow
                  title={`/${cmd.trigger}`}
                  description={cmd.description || cmd.name}
                  enabled={cmd.enabled}
                  toggleLabel={t("construct.model.agent.toggleCommand", { name: cmd.name })}
                  onToggle={(next) => updateAgentCommand(scope, projectRoot, cmd.id, { enabled: next })}
                  onEdit={() => startEdit(cmd)}
                  onRemove={() => removeAgentCommand(scope, projectRoot, cmd.id)}
                />
                {editingId === cmd.id ? (
                  <AgentItemsEditor
                    nameLabel={t("construct.model.agent.commandName")}
                    nameValue={name}
                    onNameChange={setName}
                    triggerLabel={t("construct.model.agent.commandTrigger")}
                    triggerValue={trigger}
                    onTriggerChange={setTrigger}
                    descLabel={t("construct.model.agent.commandDesc")}
                    descValue={description}
                    onDescChange={setDescription}
                    contentLabel={t("construct.model.agent.commandContent")}
                    contentValue={content}
                    onContentChange={setContent}
                    onCancel={resetForm}
                    onSave={save}
                    saveDisabled={!name.trim() || !trigger.trim() || !content.trim()}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AgentSectionCard>
    </BasicsSettingsSection>
  );
}

export function ConstructAgentRulesSection() {
  const { t } = useI18n();
  const revision = useAgentRevision();
  const projectRoot = useProjectRoot();
  const [scope, setScope] = useState<AgentScope>("global");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const rules = useMemo(() => readAgentRules(scope, projectRoot), [scope, projectRoot, revision]);

  const resetForm = () => {
    setName("");
    setContent("");
    setCreating(false);
    setEditingId(null);
  };

  const startEdit = (rule: AgentRule) => {
    setEditingId(rule.id);
    setName(rule.name);
    setContent(rule.content);
    setCreating(false);
  };

  const save = () => {
    if (!name.trim() || !content.trim()) return;
    if (editingId) {
      updateAgentRule(scope, projectRoot, editingId, { name, content });
    } else {
      addAgentRule(scope, projectRoot, { name, content });
    }
    resetForm();
  };

  return (
    <BasicsSettingsSection title={t("construct.model.agent.rulesHeading")}>
      <AgentSectionCard>
        <div className="lc-agent-card__intro">
          <p className="lc-agent-card__lead">{t("construct.model.agent.rulesLead")}</p>
          <button type="button" className="lc-agent-card__create" onClick={() => { resetForm(); setCreating(true); }}>
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            {t("construct.model.agent.create")}
          </button>
        </div>
        <AgentScopeTabs scope={scope} onChange={setScope} projectOpen={Boolean(projectRoot)} />
        {creating ? (
          <AgentItemsEditor
            nameLabel={t("construct.model.agent.ruleName")}
            nameValue={name}
            onNameChange={setName}
            contentLabel={t("construct.model.agent.ruleContent")}
            contentValue={content}
            onContentChange={setContent}
            onCancel={resetForm}
            onSave={save}
            saveDisabled={!name.trim() || !content.trim()}
          />
        ) : null}
        {rules.length === 0 ? (
          <AgentEmptyState
            icon={<FileText size={22} strokeWidth={1.75} aria-hidden />}
            title={t("construct.model.agent.rulesEmpty")}
            hint={t("construct.model.agent.rulesEmptyHint")}
          />
        ) : (
          <div className="lc-agent-item-list">
            {rules.map((rule) => (
              <div key={rule.id}>
                <AgentItemRow
                  title={rule.name}
                  enabled={rule.enabled}
                  toggleLabel={t("construct.model.agent.toggleRule", { name: rule.name })}
                  onToggle={(next) => updateAgentRule(scope, projectRoot, rule.id, { enabled: next })}
                  onEdit={() => startEdit(rule)}
                  onRemove={() => removeAgentRule(scope, projectRoot, rule.id)}
                />
                {editingId === rule.id ? (
                  <AgentItemsEditor
                    nameLabel={t("construct.model.agent.ruleName")}
                    nameValue={name}
                    onNameChange={setName}
                    contentLabel={t("construct.model.agent.ruleContent")}
                    contentValue={content}
                    onContentChange={setContent}
                    onCancel={resetForm}
                    onSave={save}
                    saveDisabled={!name.trim() || !content.trim()}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </AgentSectionCard>
    </BasicsSettingsSection>
  );
}

export function ConstructAgentMemoriesSection() {
  const { t } = useI18n();
  const revision = useAgentRevision();
  const projectRoot = useProjectRoot();
  const [scope, setScope] = useState<AgentScope>("global");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const memoriesEnabled = readMemoriesFeatureEnabled();

  const memories = useMemo(() => readAgentMemories(scope, projectRoot), [scope, projectRoot, revision]);

  const resetForm = () => {
    setContent("");
    setCreating(false);
    setEditingId(null);
  };

  const save = () => {
    if (!content.trim()) return;
    if (editingId) {
      updateAgentMemory(scope, projectRoot, editingId, { content });
    } else {
      addAgentMemory(scope, projectRoot, content);
    }
    resetForm();
  };

  return (
    <BasicsSettingsSection
      title={
        <>
          {t("construct.model.agent.memoriesHeading")}
          <span className="lc-basics-settings__badge">{t("construct.model.agent.beta")}</span>
        </>
      }
    >
      <AgentSectionCard>
        <BasicsSettingsRow
          label={t("construct.model.agent.memoriesFeature")}
          description={t("construct.model.agent.memoriesFeatureDesc")}
        >
          <ConstructAgentSwitch
            id="lc-agent-memories-feature"
            checked={memoriesEnabled}
            onChange={writeMemoriesFeatureEnabled}
            label={t("construct.model.agent.memoriesFeature")}
          />
        </BasicsSettingsRow>
        <div className="lc-agent-card__intro">
          <p className="lc-agent-card__lead">{t("construct.model.agent.memoriesLead")}</p>
          <button type="button" className="lc-agent-card__create" onClick={() => { resetForm(); setCreating(true); }} disabled={!memoriesEnabled}>
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            {t("construct.model.agent.create")}
          </button>
        </div>
        <AgentScopeTabs scope={scope} onChange={setScope} projectOpen={Boolean(projectRoot)} />
        {creating || editingId ? (
          <form
            className="lc-agent-editor"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label className="lc-agent-editor__field">
              <span>{t("construct.model.agent.memoryContent")}</span>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} spellCheck={false} />
            </label>
            <div className="lc-agent-editor__actions">
              <button type="button" className="lc-agent-editor__cancel" onClick={resetForm}>
                {t("construct.model.manager.cancel")}
              </button>
              <button type="submit" className="lc-agent-editor__save" disabled={!content.trim()}>
                {t("construct.model.manager.saveCustom")}
              </button>
            </div>
          </form>
        ) : null}
        {memories.length === 0 ? (
          <AgentEmptyState
            icon={<Brain size={22} strokeWidth={1.75} aria-hidden />}
            title={t("construct.model.agent.memoriesEmpty")}
            hint={t("construct.model.agent.memoriesEmptyHint")}
          />
        ) : (
          <div className="lc-agent-item-list">
            {memories.map((memory) => (
              <div key={memory.id}>
                <AgentItemRow
                  title={memory.content.length > 72 ? `${memory.content.slice(0, 72)}…` : memory.content}
                  enabled={memory.enabled}
                  toggleLabel={t("construct.model.agent.toggleMemory")}
                  onToggle={(next) => updateAgentMemory(scope, projectRoot, memory.id, { enabled: next })}
                  onEdit={() => {
                    setEditingId(memory.id);
                    setContent(memory.content);
                    setCreating(false);
                  }}
                  onRemove={() => removeAgentMemory(scope, projectRoot, memory.id)}
                />
              </div>
            ))}
          </div>
        )}
      </AgentSectionCard>
    </BasicsSettingsSection>
  );
}
