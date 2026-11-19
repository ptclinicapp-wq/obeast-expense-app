import { NavLink, Outlet, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/", label: "⌂ หน้าหลัก", shortLabel: "⌂\nหน้าหลัก" },
  { to: "/history", label: "≡ รายการ", shortLabel: "≡\nรายการ" },
  { to: "/summary", label: "◔ สรุป", shortLabel: "◔\nสรุป" },
  { to: "/projects", label: "▣ Projects", shortLabel: "▣\nProject" },
  { to: "/settings", label: "⚙ ตั้งค่า", shortLabel: "⚙\nตั้งค่า" },
];

export function AppShell() {
  const navigate = useNavigate();

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="logo">P&amp;T</div>
          <div>
            <b>Pao &amp; Tim Money</b>
            <small>Local-first finance</small>
          </div>
        </div>

        <nav className="nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}>
              {item.label}
            </NavLink>
          ))}
          <NavLink className="add" to="/add">
            ＋ เพิ่มรายการ
          </NavLink>
        </nav>

        <small className="muted side-note">
          ข้อมูลเก็บใน browser เครื่องนี้เท่านั้น
        </small>
      </aside>

      <main className="main">
        <div className="shell">
          <Outlet />
        </div>
      </main>

      <button className="fab" type="button" onClick={() => navigate("/add")}>
        ＋
      </button>

      <nav className="bottom" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}>
            {item.shortLabel.split("\n").map((line, index) => (
              <span key={line}>
                {line}
                {index === 0 && <br />}
              </span>
            ))}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
