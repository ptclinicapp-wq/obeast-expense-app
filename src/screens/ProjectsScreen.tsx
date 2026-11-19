import { FormEvent, useState } from "react";
import { db } from "@/db/db";
import { useAppData } from "@/db/hooks";
import { Modal } from "@/components/Modal";
import { TransactionRow } from "@/components/TransactionRow";
import { createId, nowIso } from "@/domain/dates";
import {
  budgetRows,
  calculateCoupleBalance,
  formatMoney,
  pocketBalance,
  projectSpending,
} from "@/domain/finance";
import type { Currency, ProjectRecord, ProjectStatus } from "@/types/models";

interface ProjectDraft {
  name: string;
  icon: string;
  budget: string;
  status: ProjectStatus;
  currency: Currency;
}

const blankProjectDraft = (): ProjectDraft => ({
  name: "",
  icon: "✈️",
  budget: "50000",
  status: "Planning",
  currency: "THB",
});

const projectIcons = [
  ["✈️", "Travel"],
  ["🏠", "Home"],
  ["💍", "Wedding"],
  ["💻", "Tech"],
  ["🎯", "Goal"],
  ["▣", "General"],
] as const;

export function ProjectsScreen() {
  const data = useAppData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [draft, setDraft] = useState<ProjectDraft>(blankProjectDraft);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  const openProjectModal = (project?: ProjectRecord) => {
    setEditingProject(project ?? null);
    setDraft(
      project
        ? {
            name: project.name,
            icon: project.icon,
            budget: String(project.budget),
            status: project.status,
            currency: project.currency ?? "THB",
          }
        : blankProjectDraft(),
    );
    setError("");
    setModalOpen(true);
  };

  const saveProject = async (event: FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim();
    const budget = Number(draft.budget || 0);

    if (!name) {
      setError("กรุณาใส่ชื่อ Project");
      return;
    }

    if (!Number.isFinite(budget) || budget < 0) {
      setError("Budget ต้องไม่ติดลบ");
      return;
    }

    if (editingProject && (editingProject.currency ?? "THB") !== draft.currency &&
      (data.transactions.some((t) => t.projectId === editingProject.id) || data.recurringRules.some((r) => r.template.projectId === editingProject.id))) {
      setError("Project นี้มีรายการแล้ว กรุณาสร้าง Project ใหม่สำหรับสกุลเงินอื่น"); return;
    }
    const timestamp = nowIso();
    await db.projects.put({
      id: editingProject?.id ?? createId(),
      name,
      icon: draft.icon || "▣",
      budget,
      status: draft.status,
      currency: draft.currency,
      createdAt: editingProject?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
    setModalOpen(false);
  };

  const archiveProject = async (project: ProjectRecord) => {
    await db.projects.update(project.id, {
      status: "Archived",
      updatedAt: nowIso(),
    });
  };

  return (
    <section className="view active">
      <div className="head">
        <div>
          <h1>Projects</h1>
          <p>รวมรายจ่ายพิเศษเป็นเรื่องๆ เช่น Japan Trip โดยยังเก็บ Category เดิมไว้</p>
        </div>
        <button className="primary" type="button" onClick={() => openProjectModal()}>
          ＋ Project
        </button>
      </div>

      <div className="project-list">
        {data.projects.length ? (
          data.projects.map((project) => {
            const currency = project.currency ?? "THB";
            const money = (value: number) => formatMoney(value, currency);
            const projectTransactions = data.transactions
              .filter((transaction) => transaction.projectId === project.id)
              .sort((a, b) => b.datetime.localeCompare(a.datetime));
            const projectExpenses = projectTransactions.filter(
              (transaction) => transaction.type === "expense",
            );
            const spending = projectSpending(project.id, data.transactions);

            const progress = project.budget
              ? Math.min(100, (spending / project.budget) * 100)
              : 0;
            const projectBalance = calculateCoupleBalance(projectExpenses);
            const categoryRows = budgetRows(
              "",
              projectExpenses,
              [],
              data.categories,
            );
            const linkedPockets = data.savingsPockets.filter(
              (pocket) => pocket.linkedProjectId === project.id,
            );
            const expanded = expandedId === project.id;

            return (
              <div
                className={`card project-card ${expanded ? "expanded" : ""}`}
                key={project.id}
                onClick={() => setExpandedId(expanded ? null : project.id)}
              >
                <div className="project-title">
                  <div>
                    <h3>
                      {project.icon} {project.name}
                    </h3>
                    <small className="muted">แตะเพื่อดู Category + Transactions</small>
                  </div>
                  <span className="status">{project.status}</span>
                </div>

                <div className="project-stat">
                  <div>
                    <small>เงินที่มี / งบ ({currency})</small>
                    <b>{money(project.budget)}</b>
                  </div>
                  <div>
                    <small>ใช้ไปแล้ว</small>
                    <b>{money(spending)}</b>
                  </div>
                  <div>
                    <small>คงเหลือ</small>
                    <b className="saving">{money(project.budget - spending)}</b>
                  </div>
                </div>

                <div className={`progress ${spending > project.budget ? "over" : ""}`}>
                  <div style={{ width: `${progress}%` }} />
                </div>
                <small className="muted">
                  {spending <= project.budget
                    ? `เหลือ ${money(project.budget - spending)}`
                    : `เกินงบ ${money(spending - project.budget)}`}
                  {" • "}
                  {projectBalance.net === 0
                    ? "ไม่มี settlement"
                    : projectBalance.net > 0
                      ? `ติมค้างเปา ${money(projectBalance.net)}`
                      : `เปาค้างติม ${money(Math.abs(projectBalance.net))}`}
                </small>

                {expanded && (
                  <div className="project-detail" onClick={(event) => event.stopPropagation()}>
                    <h4>Linked Savings Pocket</h4>
                    {linkedPockets.length ? (
                      linkedPockets.map((pocket) => (
                        <div className="detail-row" key={pocket.id}>
                          <div className="detail-head">
                            <div>
                              <b>
                                {pocket.icon} {pocket.name}
                              </b>
                              <small className="muted">
                                เป้าหมาย {formatMoney(pocket.targetAmount)}
                              </small>
                            </div>
                            <b>{formatMoney(pocketBalance(pocket, data.transactions))}</b>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="muted">ยังไม่มี Pocket ที่เชื่อมกับ Project นี้</span>
                    )}

                    <h4>Breakdown ตาม Category</h4>
                    {categoryRows.length ? (
                      categoryRows.map((row) => (
                        <div className="chartrow" key={row.categoryId}>
                          <span>{row.category?.name ?? "ไม่ระบุหมวด"}</span>
                          <div className="bar">
                            <div
                              style={{
                                width: `${spending ? (row.actual / spending) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <b>{money(row.actual)}</b>
                        </div>
                      ))
                    ) : (
                      <span className="muted">ยังไม่มีรายจ่ายใน Project นี้</span>
                    )}

                    <h4>Pao/Tim Settlement</h4>
                    <div className="mini3">
                      <div>
                        <small>ติมค้างเปา</small>
                        <b>{money(projectBalance.timOwesPao)}</b>
                      </div>
                      <div>
                        <small>เปาค้างติม</small>
                        <b>{money(projectBalance.paoOwesTim)}</b>
                      </div>
                      <div>
                        <small>สุทธิ</small>
                        <b>{money(Math.abs(projectBalance.net))}</b>
                      </div>
                    </div>

                    <h4>Transactions</h4>
                    {projectTransactions.length ? (
                      projectTransactions.map((transaction) => (
                        <TransactionRow
                          actions
                          data={data}
                          key={transaction.id}
                          transaction={transaction}
                        />
                      ))
                    ) : (
                      <span className="muted">ยังไม่มี Transaction</span>
                    )}

                    <div className="actions">
                      <button
                        className="soft"
                        type="button"
                        onClick={() => openProjectModal(project)}
                      >
                        แก้ Project
                      </button>
                      {project.status !== "Archived" && (
                        <button
                          className="danger"
                          type="button"
                          onClick={() => archiveProject(project)}
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="card muted">ยังไม่มี Project</div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editingProject ? "แก้ไข Project" : "เพิ่ม Project"}
          subtitle="ใช้แยกค่าใช้จ่ายเป็นเรื่องๆ โดย Category เดิมยังอยู่เหมือนเดิม"
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={saveProject}>
            <div className="project-modal-grid">
              <label className="field">
                <span>ชื่อ Project</span>
                <input
                  className="input"
                  placeholder="เช่น Japan Trip 2027"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Icon</span>
                <select
                  className="input"
                  value={draft.icon}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, icon: event.target.value }))
                  }
                >
                  {projectIcons.map(([icon, label]) => (
                    <option key={icon} value={icon}>
                      {icon} {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>สกุลเงิน</span>
                <select className="input" value={draft.currency}
                  disabled={Boolean(editingProject && (data.transactions.some((t) => t.projectId === editingProject.id) || data.recurringRules.some((r) => r.template.projectId === editingProject.id)))}
                  onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value as Currency }))}>
                  <option value="THB">บาท (THB)</option><option value="JPY">เยน (JPY)</option>
                </select>
                <small className="muted">เมื่อมีรายการแล้วจะเปลี่ยนสกุลเงินไม่ได้</small>
              </label>
              <label className="field">
                <span>เงินที่มี / งบ ({draft.currency})</span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={draft.budget}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, budget: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  className="input"
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as ProjectStatus,
                    }))
                  }
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </label>
            </div>

            <div className="project-modal-preview">
              <small>ตัวอย่างการใช้งาน</small>
              <div>
                <b>
                  {draft.icon} {draft.name || "Japan Trip 2027"}
                </b>
              </div>
              <small>
                Budget {formatMoney(Number(draft.budget || 0), draft.currency)} • {draft.status}
              </small>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="actions">
              <button className="btn" type="button" onClick={() => setModalOpen(false)}>
                ยกเลิก
              </button>
              <button className="primary" type="submit">
                {editingProject ? "บันทึกการแก้ไข" : "เพิ่ม Project"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
