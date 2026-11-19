import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { db } from "@/db/db";
import { seedDatabase } from "@/db/seed";
import { runRecurringCatchUp } from "@/domain/recurring";
import { AddTransactionScreen } from "@/screens/AddTransactionScreen";
import { HistoryScreen } from "@/screens/HistoryScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { ProjectsScreen } from "@/screens/ProjectsScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { SummaryScreen } from "@/screens/SummaryScreen";
import { AppShell } from "./AppShell";

export default function App() {
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await seedDatabase();
      const generatedCount = await runRecurringCatchUp();
      const theme = await db.appSettings.get("theme");

      document.documentElement.setAttribute(
        "data-theme",
        theme?.value === "dark" ? "dark" : "light",
      );

      if (!cancelled) {
        setReady(true);
        if (generatedCount > 0) {
          setToast(`บันทึกรายการประจำอัตโนมัติ ${generatedCount} รายการ`);
        }
      }
    }

    bootstrap().catch((error: unknown) => {
      console.error(error);
      if (!cancelled) {
        setReady(true);
        setToast("เปิดฐานข้อมูลไม่สำเร็จ");
      }
    });

    const catchUp = () => {
      runRecurringCatchUp()
        .then((count) => {
          if (count > 0) setToast(`บันทึกรายการประจำอัตโนมัติ ${count} รายการ`);
        })
        .catch(() => undefined);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") catchUp();
    };

    const interval = window.setInterval(catchUp, 60_000);
    window.addEventListener("focus", catchUp);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", catchUp);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!ready) {
    return (
      <div className="boot">
        <div className="logo">P&amp;T</div>
        <p>กำลังเปิดสมุดบัญชีในเครื่องนี้...</p>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeScreen />} />
          <Route path="add" element={<AddTransactionScreen />} />
          <Route path="history" element={<HistoryScreen />} />
          <Route path="summary" element={<SummaryScreen />} />
          <Route path="projects" element={<ProjectsScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>
      </Routes>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
