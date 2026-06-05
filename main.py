import tkinter as tk
from tkinter import ttk, filedialog
import json
import os
import sys
from datetime import date, timedelta
from collections import defaultdict


def resource_path(rel: str) -> str:
    base = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, rel)

# ── Constants ──────────────────────────────────────────────────────────────────

APP_NAME = "AutoWeeklyReportCreator"
ICON_ICO = resource_path(os.path.join("icons", "favicon.ico"))
DEFAULT_USER_NAME = "서장원"
RECIPIENT = "jhlee0804@gmail.com"
DATA_DIR = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), APP_NAME)
DATA_FILE = os.path.join(DATA_DIR, "data.json")
DAY_NAMES = ["토", "일", "월", "화", "수", "목", "금"]

import zlib

# Catppuccin Mocha 기반 팔레트
BG      = "#181825"   # 바탕 (mantle)
BG2     = "#1e1e2e"   # 패널 (base)
BG3     = "#313244"   # surface0 — 버튼/구분
CARD    = "#252537"   # 항목 카드
CARD_HI = "#313244"   # 항목 카드 hover
FG      = "#cdd6f4"   # 본문 텍스트
FG2     = "#a6adc8"   # 보조 텍스트
FG3     = "#6c7086"   # 흐린 텍스트 (placeholder)
ACCENT  = "#89b4fa"   # blue
ACCENT2 = "#cba6f7"   # mauve
WARN    = "#f38ba8"   # red
SUCCESS = "#a6e3a1"   # green
ENTRY   = "#313244"
LINE    = "#313244"   # 구분선

# 프로젝트별 색상 (이름 기준 결정적 배정)
PROJECT_COLORS = [
    "#89b4fa",  # blue
    "#a6e3a1",  # green
    "#fab387",  # peach
    "#cba6f7",  # mauve
    "#94e2d5",  # teal
    "#f9e2af",  # yellow
    "#f5c2e7",  # pink
    "#b4befe",  # lavender
    "#eba0ac",  # maroon
    "#74c7ec",  # sapphire
]

def project_color(name: str) -> str:
    if not name:
        return FG2
    return PROJECT_COLORS[zlib.crc32(name.encode("utf-8")) % len(PROJECT_COLORS)]

def lighten(hexcol: str, f: float = 0.10) -> str:
    h = hexcol.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    r = min(255, int(r + (255 - r) * f))
    g = min(255, int(g + (255 - g) * f))
    b = min(255, int(b + (255 - b) * f))
    return f"#{r:02x}{g:02x}{b:02x}"

def blend(c1: str, c2: str, t: float) -> str:
    a, b = c1.lstrip("#"), c2.lstrip("#")
    ar, ag, ab = int(a[0:2], 16), int(a[2:4], 16), int(a[4:6], 16)
    br, bg_, bb = int(b[0:2], 16), int(b[2:4], 16), int(b[4:6], 16)
    return f"#{int(ar+(br-ar)*t):02x}{int(ag+(bg_-ag)*t):02x}{int(ab+(bb-ab)*t):02x}"

# 주말 색상 (한국 달력 관례: 토=파랑, 일=빨강)
SAT_COLOR = "#74c7ec"  # sapphire
SUN_COLOR = "#f38ba8"  # red

FONT     = ("Malgun Gothic", 10)
FONT_SM  = ("Malgun Gothic", 9)
FONT_XS  = ("Malgun Gothic", 8)
FONT_BD  = ("Malgun Gothic", 10, "bold")
FONT_TAG = ("Malgun Gothic", 8, "bold")
FONT_HDR = ("Malgun Gothic", 11, "bold")
FONT_DAY = ("Malgun Gothic", 12, "bold")


# ── Data Layer ─────────────────────────────────────────────────────────────────

class DataStore:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        self._d = self._load()

    def _load(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {"projects": [], "weeks": {}, "user_name": DEFAULT_USER_NAME}

    def save(self):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(self._d, f, ensure_ascii=False, indent=2)

    def get_projects(self):
        return list(self._d.get("projects", []))

    def get_user_name(self):
        return self._d.get("user_name", DEFAULT_USER_NAME)

    def set_user_name(self, name):
        self._d["user_name"] = name
        self.save()

    def set_projects(self, projects):
        self._d["projects"] = projects
        self.save()

    def _wk(self, k):
        return self._d["weeks"].setdefault(k, {
            "entries": {}, "due_dates": [], "milestones": [], "blockers": []
        })

    def get_entries(self, wk, ds):
        return list(self._wk(wk)["entries"].get(ds, []))

    def set_entries(self, wk, ds, v):
        self._wk(wk)["entries"][ds] = v
        self.save()

    def get_due_dates(self, wk):
        return list(self._wk(wk).get("due_dates", []))

    def set_due_dates(self, wk, v):
        self._wk(wk)["due_dates"] = v
        self.save()

    def get_milestones(self, wk):
        return list(self._wk(wk).get("milestones", []))

    def set_milestones(self, wk, v):
        self._wk(wk)["milestones"] = v
        self.save()

    def get_blockers(self, wk):
        return list(self._wk(wk).get("blockers", []))

    def set_blockers(self, wk, v):
        self._wk(wk)["blockers"] = v
        self.save()

    def full_week(self, wk):
        return self._wk(wk)


# ── Date Helpers ───────────────────────────────────────────────────────────────

def week_saturday(d: date) -> date:
    """Saturday starting the Sat–Fri week containing d."""
    return d - timedelta(days=(d.isoweekday() - 6) % 7)

def week_dates(d: date):
    s = week_saturday(d)
    return [s + timedelta(days=i) for i in range(7)]

def week_key(saturday: date) -> str:
    mon = saturday + timedelta(days=2)
    y, w, _ = mon.isocalendar()
    return f"{y}-W{w:02d}"

def week_friday(saturday: date) -> date:
    return saturday + timedelta(days=6)


# ── Base Dialog ────────────────────────────────────────────────────────────────

class Dialog(tk.Toplevel):
    def __init__(self, parent, title, w=420, h=220):
        super().__init__(parent)
        self.title(title)
        self.configure(bg=BG)
        try:
            self.iconbitmap(ICON_ICO)
        except Exception:
            pass
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()
        self.result = None
        self.update_idletasks()
        px = parent.winfo_rootx() + parent.winfo_width() // 2 - w // 2
        py = parent.winfo_rooty() + parent.winfo_height() // 2 - h // 2
        self.geometry(f"{w}x{h}+{px}+{py}")

    def _footer(self, ok="추가"):
        f = tk.Frame(self, bg=BG)
        f.pack(fill="x", padx=16, pady=(4, 12))
        tk.Button(f, text="취소", bg=BG3, fg=FG, relief="flat",
                  command=self.destroy, font=FONT).pack(side="right", padx=4)
        tk.Button(f, text=ok, bg=ACCENT, fg="#1e1e2e", relief="flat",
                  command=self._submit, font=FONT_BD).pack(side="right")

    def _submit(self):
        pass

    def _flash(self, widget):
        try:
            orig = widget.cget("bg")
            widget.config(bg="#4a1a28")
            widget.focus_set()
            self.after(550, lambda: widget.config(bg=orig))
        except Exception:
            pass

    def _flash_combo(self, combo):
        s = ttk.Style(self)
        s.configure("Err.TCombobox", fieldbackground="#4a1a28")
        combo.config(style="Err.TCombobox")
        combo.focus_set()
        self.after(550, lambda: combo.config(style="TCombobox"))


# ── Dialogs ────────────────────────────────────────────────────────────────────

class AddEntryDialog(Dialog):
    def __init__(self, parent, projects, day_label, entry=None):
        super().__init__(parent, f"활동 {'수정' if entry else '추가'} — {day_label}", 460, 240)
        self._projects = projects
        self._entry = entry
        self._build()

    def _build(self):
        pad = dict(padx=16, pady=(8, 0))
        tk.Label(self, text="프로젝트", bg=BG, fg=FG2, font=FONT_SM, anchor="w").pack(fill="x", **pad)
        default = self._entry["project"] if self._entry else (self._projects[0] if self._projects else "")
        self._pvar = tk.StringVar(value=default)
        self._combo = ttk.Combobox(self, textvariable=self._pvar, values=self._projects,
                                   state="normal", font=FONT)
        self._combo.pack(fill="x", padx=16, pady=(2, 0))

        tk.Label(self, text="내용  (Ctrl+Enter 저장)", bg=BG, fg=FG2, font=FONT_SM, anchor="w").pack(fill="x", **pad)
        self._txt = tk.Text(self, height=3, bg=ENTRY, fg=FG, insertbackground=FG,
                            relief="flat", font=FONT, wrap="word", padx=6, pady=4)
        self._txt.pack(fill="x", padx=16, pady=(2, 0))
        if self._entry:
            self._txt.insert("1.0", self._entry["text"])

        self._footer("저장" if self._entry else "추가")
        self.bind("<Control-Return>", lambda _: self._submit())
        self._txt.focus_set()

    def _submit(self):
        proj = self._pvar.get().strip()
        text = self._txt.get("1.0", "end").strip()
        if not proj:
            self._flash_combo(self._combo)
            return
        if not text:
            self._flash(self._txt)
            return
        self.result = {"project": proj, "text": text}
        self.destroy()


class AddDueDateDialog(Dialog):
    def __init__(self, parent, projects, item=None):
        super().__init__(parent, "마감일 " + ("수정" if item else "추가"), 440, 240)
        self._projects = projects
        self._item = item
        self._build()

    def _build(self):
        f = tk.Frame(self, bg=BG)
        f.pack(fill="x", padx=16, pady=10)
        f.columnconfigure(1, weight=1)

        tk.Label(f, text="프로젝트", bg=BG, fg=FG2, font=FONT_SM).grid(row=0, column=0, sticky="w", pady=4)
        default = self._item.get("project", "") if self._item else (self._projects[0] if self._projects else "")
        self._pvar = tk.StringVar(value=default)
        ttk.Combobox(f, textvariable=self._pvar, values=self._projects,
                     state="normal", font=FONT).grid(row=0, column=1, columnspan=2,
                                                      sticky="ew", padx=(8, 0), pady=4)

        tk.Label(f, text="작업", bg=BG, fg=FG2, font=FONT_SM).grid(row=1, column=0, sticky="w", pady=4)
        self._task = tk.Entry(f, bg=ENTRY, fg=FG, insertbackground=FG, relief="flat", font=FONT)
        self._task.grid(row=1, column=1, columnspan=2, sticky="ew", padx=(8, 0), pady=4)

        tk.Label(f, text="날짜", bg=BG, fg=FG2, font=FONT_SM).grid(row=2, column=0, sticky="w", pady=4)
        self._date = tk.Entry(f, bg=ENTRY, fg=FG, insertbackground=FG, relief="flat", font=FONT, width=12)
        self._date.grid(row=2, column=1, sticky="w", padx=(8, 0), pady=4)
        tk.Label(f, text="작은 작업에 대한 마감일 입력", bg=BG, fg=FG2, font=FONT_SM).grid(
            row=2, column=2, sticky="w", padx=6)

        if self._item:
            self._task.insert(0, self._item["task"])
            self._date.insert(0, self._item["date"])

        self._footer("저장" if self._item else "추가")
        self._task.focus_set()
        self.bind("<Return>", lambda _: self._submit())

    def _submit(self):
        proj = self._pvar.get().strip()
        task = self._task.get().strip()
        d = self._date.get().strip()
        if not task:
            self._flash(self._task)
            return
        if not d:
            self._flash(self._date)
            return
        self.result = {"project": proj, "task": task, "date": d}
        self.destroy()


class AddMilestoneDialog(Dialog):
    def __init__(self, parent, projects, item=None):
        super().__init__(parent, "마일스톤 " + ("수정" if item else "추가"), 440, 220)
        self._projects = projects
        self._item = item
        self._build()

    def _build(self):
        f = tk.Frame(self, bg=BG)
        f.pack(fill="x", padx=16, pady=10)
        f.columnconfigure(1, weight=1)

        tk.Label(f, text="프로젝트", bg=BG, fg=FG2, font=FONT_SM).grid(row=0, column=0, sticky="w", pady=4)
        default = self._item["project"] if self._item else (self._projects[0] if self._projects else "")
        self._pvar = tk.StringVar(value=default)
        self._pcombo = ttk.Combobox(f, textvariable=self._pvar, values=self._projects,
                                    state="normal", font=FONT)
        self._pcombo.grid(row=0, column=1, sticky="ew", padx=(8, 0), pady=4)

        tk.Label(f, text="내용", bg=BG, fg=FG2, font=FONT_SM).grid(row=1, column=0, sticky="w", pady=4)
        self._detail = tk.Entry(f, bg=ENTRY, fg=FG, insertbackground=FG, relief="flat", font=FONT)
        self._detail.grid(row=1, column=1, sticky="ew", padx=(8, 0), pady=4)

        tk.Label(f, text="목표시점", bg=BG, fg=FG2, font=FONT_SM).grid(row=2, column=0, sticky="w", pady=4)
        self._target = tk.Entry(f, bg=ENTRY, fg=FG, insertbackground=FG, relief="flat", font=FONT, width=14)
        self._target.grid(row=2, column=1, sticky="w", padx=(8, 0), pady=4)
        tk.Label(f, text="큰 작업에 대한 마감일 입력", bg=BG, fg=FG2, font=FONT_SM).grid(
            row=2, column=2, sticky="w", padx=6)

        if self._item:
            self._detail.insert(0, self._item["detail"])
            self._target.insert(0, self._item["target"])

        self._footer("저장" if self._item else "추가")
        self.bind("<Return>", lambda _: self._submit())

    def _submit(self):
        proj = self._pvar.get().strip()
        detail = self._detail.get().strip()
        target = self._target.get().strip()
        if not proj:
            self._flash_combo(self._pcombo)
            return
        if not detail:
            self._flash(self._detail)
            return
        if not target:
            self._flash(self._target)
            return
        self.result = {"project": proj, "detail": detail, "target": target}
        self.destroy()


class SimpleTextDialog(Dialog):
    def __init__(self, parent, title, initial=""):
        super().__init__(parent, title, 400, 140)
        tk.Label(self, text="내용", bg=BG, fg=FG2, font=FONT_SM, anchor="w").pack(
            fill="x", padx=16, pady=(12, 2))
        self._e = tk.Entry(self, bg=ENTRY, fg=FG, insertbackground=FG, relief="flat", font=FONT)
        self._e.pack(fill="x", padx=16)
        if initial:
            self._e.insert(0, initial)
        self._footer()
        self._e.focus_set()
        self.bind("<Return>", lambda _: self._submit())

    def _submit(self):
        text = self._e.get().strip()
        if not text:
            self._flash(self._e)
            return
        self.result = text
        self.destroy()


class ProjectManagerDialog(Dialog):
    def __init__(self, parent, store, on_change):
        super().__init__(parent, "프로젝트 관리", 320, 420)
        self._store = store
        self._on_change = on_change
        self._build()

    def _build(self):
        tk.Label(self, text="연구 주제 / 프로젝트", bg=BG, fg=FG, font=FONT_BD).pack(pady=(14, 6))

        self._lf = tk.Frame(self, bg=BG2)
        self._lf.pack(fill="both", expand=True, padx=16)
        self._redraw()

        af = tk.Frame(self, bg=BG)
        af.pack(fill="x", padx=16, pady=8)
        self._ne = tk.Entry(af, bg=ENTRY, fg=FG, insertbackground=FG, relief="flat", font=FONT)
        self._ne.pack(side="left", fill="x", expand=True)
        self._ne.bind("<Return>", lambda _: self._add())
        tk.Button(af, text="+ 추가", bg=SUCCESS, fg="#1e1e2e", relief="flat",
                  command=self._add, font=FONT_BD).pack(side="left", padx=(6, 0))

        tk.Button(self, text="닫기", bg=BG3, fg=FG, relief="flat",
                  command=self.destroy, font=FONT).pack(pady=(0, 10))
        self._ne.focus_set()

    def _redraw(self):
        for w in self._lf.winfo_children():
            w.destroy()
        projects = self._store.get_projects()
        if not projects:
            tk.Label(self._lf, text="프로젝트가 없습니다.", bg=BG2, fg=FG2,
                     font=FONT_SM).pack(pady=10)
            return
        for i, p in enumerate(projects):
            row = tk.Frame(self._lf, bg=BG2)
            row.pack(fill="x", padx=4, pady=2)
            tk.Label(row, text="●", bg=BG2, fg=project_color(p),
                     font=FONT).pack(side="left", padx=(4, 2))
            tk.Label(row, text=p, bg=BG2, fg=FG, font=FONT).pack(side="left")
            tk.Button(row, text="✕", bg=BG2, fg=WARN, relief="flat", font=FONT_SM,
                      cursor="hand2", command=lambda idx=i: self._remove(idx)).pack(side="right")

    def _add(self):
        name = self._ne.get().strip()
        if not name:
            return
        projects = self._store.get_projects()
        if name not in projects:
            projects.append(name)
            self._store.set_projects(projects)
            self._on_change()
        self._ne.delete(0, "end")
        self._redraw()

    def _remove(self, idx):
        projects = self._store.get_projects()
        projects.pop(idx)
        self._store.set_projects(projects)
        self._on_change()
        self._redraw()


class SettingsDialog(Dialog):
    def __init__(self, parent, store, on_change):
        super().__init__(parent, "설정", 400, 230)
        self._store = store
        self._on_change = on_change
        self._build()

    def _build(self):
        tk.Label(self, text="이름 / 표시명", bg=BG, fg=FG, font=FONT_BD).pack(pady=(18, 2))
        tk.Label(self, text="주간 메모 제목에 들어갑니다 — [weekly]이름 YYMMDD",
                 bg=BG, fg=FG2, font=FONT_SM).pack()

        self._e = tk.Entry(self, bg=ENTRY, fg=FG, insertbackground=FG,
                           relief="flat", font=FONT, justify="center")
        self._e.pack(fill="x", padx=24, pady=(10, 4))
        self._e.insert(0, self._store.get_user_name())

        self._prev = tk.Label(self, text="", bg=BG, fg=ACCENT, font=FONT_BD)
        self._prev.pack(pady=(2, 6))
        self._e.bind("<KeyRelease>", lambda _: self._update_prev())
        self._update_prev()

        self._footer("저장")
        self._e.focus_set()
        self._e.select_range(0, "end")
        self.bind("<Return>", lambda _: self._submit())

    def _update_prev(self):
        name = self._e.get().strip() or "이름"
        self._prev.config(text=f"[weekly]{name} YYMMDD")

    def _submit(self):
        name = self._e.get().strip()
        if name:
            self._store.set_user_name(name)
            self.result = name
            self._on_change()
        self.destroy()


class OutputDialog(Dialog):
    def __init__(self, parent, text, subject=""):
        super().__init__(parent, "Weekly Report 생성 완료", 720, 600)
        self._text = text
        self._subject = subject
        self._build()

    def _build(self):
        tk.Label(self, text="아래 내용을 복사해서 이메일에 붙여넣으세요",
                 bg=BG, fg=FG2, font=FONT_SM).pack(pady=(10, 4))

        if self._subject:
            sf = tk.Frame(self, bg=BG)
            sf.pack(fill="x", padx=16, pady=(0, 4))
            tk.Label(sf, text="메일 제목:", bg=BG, fg=FG2, font=FONT_SM).pack(side="left")
            tk.Label(sf, text=self._subject, bg=BG, fg=ACCENT, font=FONT_BD).pack(side="left", padx=(4, 0))
            self._sbtn = tk.Button(sf, text="제목 복사", bg=BG3, fg=FG, relief="flat",
                                   command=self._copy_subject, font=FONT_SM)
            self._sbtn.pack(side="right")

        tf = tk.Frame(self, bg=BG)
        tf.pack(fill="both", expand=True, padx=16)
        sb = tk.Scrollbar(tf)
        sb.pack(side="right", fill="y")
        self._ta = tk.Text(tf, bg=ENTRY, fg=FG, insertbackground=FG, relief="flat",
                           font=("Consolas", 10), wrap="word",
                           yscrollcommand=sb.set, padx=8, pady=8)
        self._ta.pack(fill="both", expand=True)
        sb.config(command=self._ta.yview)
        self._ta.insert("1.0", self._text)
        self._ta.config(state="disabled")

        bf = tk.Frame(self, bg=BG)
        bf.pack(fill="x", padx=16, pady=12)
        tk.Button(bf, text="닫기", bg=BG3, fg=FG, relief="flat",
                  command=self.destroy, font=FONT).pack(side="right", padx=4)
        tk.Button(bf, text="📁 .txt 저장", bg=BG3, fg=FG, relief="flat",
                  command=self._save, font=FONT).pack(side="right", padx=4)
        self._cbtn = tk.Button(bf, text="📋 클립보드 복사", bg=ACCENT, fg="#1e1e2e",
                                relief="flat", command=self._copy, font=FONT_BD)
        self._cbtn.pack(side="right")

    def _copy(self):
        self.clipboard_clear()
        self.clipboard_append(self._text)
        self._cbtn.config(text="✓ 복사됨!", bg=SUCCESS)
        self.after(2000, lambda: self._cbtn.config(text="📋 클립보드 복사", bg=ACCENT))

    def _copy_subject(self):
        self.clipboard_clear()
        self.clipboard_append(self._subject)
        self._sbtn.config(text="✓ 복사됨!", fg=SUCCESS)
        self.after(2000, lambda: self._sbtn.config(text="제목 복사", fg=FG))

    def _save(self):
        path = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt")],
            title="저장",
        )
        if path:
            with open(path, "w", encoding="utf-8") as f:
                f.write(self._text)


# ── Main Application ───────────────────────────────────────────────────────────

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.configure(bg=BG)
        try:
            self.iconbitmap(ICON_ICO)
        except Exception:
            pass
        self.minsize(1000, 640)
        self.geometry("1240x760")
        self._store = DataStore()
        self._user_name = self._store.get_user_name()
        self.title(f"Auto Weekly Report Creator — {self._user_name}")
        self._dates = week_dates(date.today())
        self._setup_style()
        self._build_ui()
        self._refresh()

    def _setup_style(self):
        s = ttk.Style(self)
        s.theme_use("clam")
        s.configure("TCombobox", fieldbackground=ENTRY, background=BG3,
                    foreground=FG, selectbackground=BG3, selectforeground=FG,
                    arrowcolor=FG2)
        s.map("TCombobox", fieldbackground=[("readonly", ENTRY)])

    @property
    def _wk(self):
        return week_key(self._dates[0])

    # ── UI skeleton ─────────────────────────────────────────────────────────────

    def _build_ui(self):
        # ── Top bar ──────────────────────────────────────────────────
        top = tk.Frame(self, bg=BG)
        top.pack(fill="x", padx=18, pady=(14, 10))

        self._mk_btn(top, "🗂  프로젝트", self._open_projects,
                     bg=BG3, fg=FG, font=FONT, padx=12, pady=6).pack(side="left")
        self._mk_btn(top, "⚙  설정", self._open_settings,
                     bg=BG3, fg=FG, font=FONT, padx=12, pady=6).pack(side="left", padx=(8, 0))

        nav = tk.Frame(top, bg=BG)
        nav.pack(side="left", expand=True)
        self._mk_btn(nav, "◀", self._prev_week, bg=BG2, fg=FG2,
                     font=FONT, padx=10, pady=5).pack(side="left")
        self._wk_lbl = tk.Label(nav, text="", bg=BG, fg=FG, font=FONT_HDR, width=30)
        self._wk_lbl.pack(side="left", padx=12)
        self._mk_btn(nav, "▶", self._next_week, bg=BG2, fg=FG2,
                     font=FONT, padx=10, pady=5).pack(side="left")

        self._mk_btn(top, "✦  Generate", self._generate,
                     bg=ACCENT, fg=BG, font=FONT_BD, padx=16, pady=6).pack(side="right")

        # ── Content ──────────────────────────────────────────────────
        content = tk.Frame(self, bg=BG)
        content.pack(fill="both", expand=True, padx=18, pady=(0, 14))

        self._grid_frame = tk.Frame(content, bg=BG)
        self._grid_frame.pack(fill="both", expand=True)

        tk.Frame(content, bg=LINE, height=1).pack(fill="x", pady=12)

        # Bottom: Due Dates + Milestones side by side, then Blockers
        bot = tk.Frame(content, bg=BG)
        bot.pack(fill="x")

        row1 = tk.Frame(bot, bg=BG)
        row1.pack(fill="x")
        self._dd_sec = self._section(row1, "", "Due Dates", self._add_due_date, self._carry_dd)
        self._dd_sec.pack(side="left", fill="both", expand=True, padx=(0, 6))
        self._ms_sec = self._section(row1, "", "Milestones", self._add_milestone, self._carry_ms)
        self._ms_sec.pack(side="left", fill="both", expand=True)

        self._bl_sec = self._section(bot, "", "Blockers", self._add_blocker)
        self._bl_sec.pack(fill="x", pady=(8, 0))

    # ── Styled widget helpers ────────────────────────────────────────
    def _mk_btn(self, parent, text, cmd, bg=BG3, fg=FG, font=FONT, **kw):
        b = tk.Button(parent, text=text, command=cmd, bg=bg, fg=fg, font=font,
                      relief="flat", bd=0, highlightthickness=0,
                      activebackground=lighten(bg, 0.18), activeforeground=fg,
                      cursor="hand2", **kw)
        hi = lighten(bg, 0.12)
        b.bind("<Enter>", lambda _: b.config(bg=hi))
        b.bind("<Leave>", lambda _: b.config(bg=bg))
        return b

    def _bind_hover(self, widgets, normal, hi):
        def enter(_):
            for w in widgets:
                try: w.config(bg=hi)
                except tk.TclError: pass
        def leave(_):
            for w in widgets:
                try: w.config(bg=normal)
                except tk.TclError: pass
        for w in widgets:
            w.bind("<Enter>", enter)
            w.bind("<Leave>", leave)

    def _section(self, parent, icon, title, add_cmd, carry_cmd=None):
        frame = tk.Frame(parent, bg=BG2, highlightbackground=BG3, highlightthickness=1)
        hdr = tk.Frame(frame, bg=BG2)
        hdr.pack(fill="x", padx=12, pady=(10, 4))
        tk.Label(hdr, text=icon, bg=BG2, font=FONT_SM).pack(side="left")
        tk.Label(hdr, text=title, bg=BG2, fg=ACCENT2, font=FONT_HDR).pack(side="left", padx=(6, 0))
        self._mk_btn(hdr, "+ 추가", add_cmd, bg=BG3, fg=FG, font=FONT_XS,
                     padx=8, pady=3).pack(side="right")
        if carry_cmd:
            self._mk_btn(hdr, "↩ 지난주", carry_cmd, bg=BG2, fg=FG3, font=FONT_XS,
                         padx=8, pady=3).pack(side="right", padx=(0, 6))
        items = tk.Frame(frame, bg=BG2)
        items.pack(fill="x", padx=12, pady=(2, 12))
        frame._items = items
        return frame

    # ── Week grid ───────────────────────────────────────────────────────────────

    def _refresh(self):
        s, e = self._dates[0], self._dates[6]
        self._wk_lbl.config(text=f"{self._wk}    {s.month}/{s.day} – {e.month}/{e.day}")
        self._build_grid()
        self._refresh_dd()
        self._refresh_ms()
        self._refresh_bl()

    def _build_grid(self):
        for w in self._grid_frame.winfo_children():
            w.destroy()
        self._grid_frame.rowconfigure(0, weight=1)
        for c in range(7):
            self._grid_frame.columnconfigure(c, weight=1, uniform="day")

        today = date.today()
        for col, (dn, dd) in enumerate(zip(DAY_NAMES, self._dates)):
            is_today = dd == today
            iso = dd.isoweekday()
            wkcol = SAT_COLOR if iso == 6 else (SUN_COLOR if iso == 7 else None)

            cbg = blend(BG2, wkcol, 0.06) if wkcol else BG2
            cf = tk.Frame(self._grid_frame, bg=cbg,
                          highlightbackground=ACCENT if is_today else BG3,
                          highlightthickness=2 if is_today else 1)
            cf.grid(row=0, column=col, sticky="nsew", padx=3, pady=2)

            if is_today:
                hbg, hfg, namefg = ACCENT, BG, BG
            elif wkcol:
                hbg, hfg, namefg = blend(BG3, wkcol, 0.22), FG2, wkcol
            else:
                hbg, hfg, namefg = BG3, FG2, FG
            hdr = tk.Frame(cf, bg=hbg)
            hdr.pack(fill="x")
            tk.Label(hdr, text=dn, bg=hbg, fg=namefg, font=FONT_DAY).pack(side="left", padx=10, pady=7)
            tk.Label(hdr, text=f"{dd.month}/{dd.day}", bg=hbg,
                     fg=BG if is_today else hfg, font=FONT_SM).pack(side="right", padx=10)

            entries_f = tk.Frame(cf, bg=cbg)
            entries_f.pack(fill="both", expand=True, padx=6, pady=(8, 2))

            ds = dd.isoformat()
            entries = self._store.get_entries(self._wk, ds)
            if not entries:
                tk.Label(entries_f, text="—", bg=cbg, fg=FG3, font=FONT_SM).pack(pady=8)
            for i, entry in enumerate(entries):
                self._entry_widget(entries_f, entry, i, ds)

            dl = f"{dn} {dd.month}/{dd.day}"
            self._mk_btn(cf, "+ 추가", lambda ds=ds, dl=dl: self._add_entry(ds, dl),
                         bg=cbg, fg=FG3, font=FONT_XS, pady=6).pack(fill="x", padx=6, pady=(2, 8))

    def _entry_widget(self, parent, entry, idx, ds):
        proj = entry.get("project", "")
        col = project_color(proj)

        # 카드: 왼쪽 컬러 바 + 본문
        card = tk.Frame(parent, bg=CARD)
        card.pack(fill="x", pady=3)
        bar = tk.Frame(card, bg=col, width=3)
        bar.pack(side="left", fill="y")
        body = tk.Frame(card, bg=CARD)
        body.pack(side="left", fill="both", expand=True, padx=7, pady=5)

        if proj:
            tk.Label(body, text=proj, bg=CARD, fg=col, font=FONT_TAG,
                     anchor="w").pack(fill="x")
        txt = tk.Label(body, text=entry["text"], bg=CARD, fg=FG,
                       font=FONT_SM, wraplength=135, justify="left", anchor="w")
        txt.pack(fill="x", pady=(1, 0))

        menu = tk.Menu(self, tearoff=0, bg=BG3, fg=FG, font=FONT_SM,
                       activebackground=ACCENT, activeforeground=BG, bd=0)
        menu.add_command(label="수정", command=lambda: self._edit_entry(ds, idx, entry))
        menu.add_command(label="삭제", command=lambda: self._del_entry(ds, idx))

        targets = [card, body, txt] + body.winfo_children()
        self._bind_hover([card, body, txt] + [w for w in body.winfo_children()], CARD, CARD_HI)
        for w in targets:
            w.configure(cursor="hand2")
            w.bind("<Button-1>", lambda ev: menu.tk_popup(ev.x_root, ev.y_root))
            w.bind("<Button-3>", lambda ev: menu.tk_popup(ev.x_root, ev.y_root))

    def _add_entry(self, ds, day_label):
        dlg = AddEntryDialog(self, self._store.get_projects(), day_label)
        self.wait_window(dlg)
        if dlg.result:
            entries = self._store.get_entries(self._wk, ds)
            entries.append(dlg.result)
            self._store.set_entries(self._wk, ds, entries)
            self._build_grid()

    def _edit_entry(self, ds, idx, entry):
        dd = date.fromisoformat(ds)
        dl = f"{DAY_NAMES[(dd - week_saturday(dd)).days]} {dd.month}/{dd.day}"
        dlg = AddEntryDialog(self, self._store.get_projects(), dl, entry=entry)
        self.wait_window(dlg)
        if dlg.result:
            entries = self._store.get_entries(self._wk, ds)
            entries[idx] = dlg.result
            self._store.set_entries(self._wk, ds, entries)
            self._build_grid()

    def _del_entry(self, ds, idx):
        entries = self._store.get_entries(self._wk, ds)
        entries.pop(idx)
        self._store.set_entries(self._wk, ds, entries)
        self._build_grid()

    # ── Due Dates ───────────────────────────────────────────────────────────────

    @staticmethod
    def _dd_label(x):
        p = x.get("project", "").strip()
        prefix = f"[{p}] " if p else ""
        return f"{prefix}{x['task']} → {x['date']}"

    def _refresh_dd(self):
        self._repopulate(
            self._dd_sec._items,
            [(self._dd_label(x), i, project_color(x.get("project", "")))
             for i, x in enumerate(self._store.get_due_dates(self._wk))],
            self._del_dd, self._edit_dd, empty="등록된 마감일 없음",
        )

    def _add_due_date(self):
        dlg = AddDueDateDialog(self, self._store.get_projects())
        self.wait_window(dlg)
        if dlg.result:
            items = self._store.get_due_dates(self._wk)
            items.append(dlg.result)
            self._store.set_due_dates(self._wk, items)
            self._refresh_dd()

    def _del_dd(self, idx):
        items = self._store.get_due_dates(self._wk)
        items.pop(idx)
        self._store.set_due_dates(self._wk, items)
        self._refresh_dd()

    def _edit_dd(self, idx):
        items = self._store.get_due_dates(self._wk)
        dlg = AddDueDateDialog(self, self._store.get_projects(), item=items[idx])
        self.wait_window(dlg)
        if dlg.result:
            items[idx] = dlg.result
            self._store.set_due_dates(self._wk, items)
            self._refresh_dd()

    # ── Milestones ──────────────────────────────────────────────────────────────

    def _refresh_ms(self):
        self._repopulate(
            self._ms_sec._items,
            [(f"{x['project']}: {x['detail']} → {x['target']}", i, project_color(x['project']))
             for i, x in enumerate(self._store.get_milestones(self._wk))],
            self._del_ms, self._edit_ms, empty="등록된 마일스톤 없음",
        )

    def _add_milestone(self):
        dlg = AddMilestoneDialog(self, self._store.get_projects())
        self.wait_window(dlg)
        if dlg.result:
            items = self._store.get_milestones(self._wk)
            items.append(dlg.result)
            self._store.set_milestones(self._wk, items)
            self._refresh_ms()

    def _del_ms(self, idx):
        items = self._store.get_milestones(self._wk)
        items.pop(idx)
        self._store.set_milestones(self._wk, items)
        self._refresh_ms()

    def _edit_ms(self, idx):
        items = self._store.get_milestones(self._wk)
        dlg = AddMilestoneDialog(self, self._store.get_projects(), item=items[idx])
        self.wait_window(dlg)
        if dlg.result:
            items[idx] = dlg.result
            self._store.set_milestones(self._wk, items)
            self._refresh_ms()

    # ── Blockers ────────────────────────────────────────────────────────────────

    def _refresh_bl(self):
        self._repopulate(
            self._bl_sec._items,
            [(b, i, WARN) for i, b in enumerate(self._store.get_blockers(self._wk))],
            self._del_bl, self._edit_bl, empty="등록된 blocker 없음",
        )

    def _add_blocker(self):
        dlg = SimpleTextDialog(self, "Blocker 추가")
        self.wait_window(dlg)
        if dlg.result:
            items = self._store.get_blockers(self._wk)
            items.append(dlg.result)
            self._store.set_blockers(self._wk, items)
            self._refresh_bl()

    def _del_bl(self, idx):
        items = self._store.get_blockers(self._wk)
        items.pop(idx)
        self._store.set_blockers(self._wk, items)
        self._refresh_bl()

    def _edit_bl(self, idx):
        items = self._store.get_blockers(self._wk)
        dlg = SimpleTextDialog(self, "Blocker 수정", initial=items[idx])
        self.wait_window(dlg)
        if dlg.result:
            items[idx] = dlg.result
            self._store.set_blockers(self._wk, items)
            self._refresh_bl()

    # ── Shared helpers ──────────────────────────────────────────────────────────

    def _repopulate(self, frame, items, del_cmd, edit_cmd, empty="비어 있음"):
        for w in frame.winfo_children():
            w.destroy()
        if not items:
            tk.Label(frame, text=empty, bg=BG2, fg=FG3, font=FONT_XS,
                     anchor="w").pack(fill="x", padx=2, pady=5)
            return
        for text, idx, color in items:
            card = tk.Frame(frame, bg=CARD)
            card.pack(fill="x", pady=3)
            bar = tk.Frame(card, bg=color or FG3, width=3)
            bar.pack(side="left", fill="y")
            body = tk.Frame(card, bg=CARD)
            body.pack(side="left", fill="both", expand=True)
            lbl = tk.Label(body, text=text, bg=CARD, fg=FG, font=FONT_SM, anchor="w",
                           justify="left", wraplength=440, cursor="hand2")
            lbl.pack(side="left", fill="x", expand=True, padx=(8, 4), pady=6)
            lbl.bind("<Double-Button-1>", lambda e, i=idx: edit_cmd(i))
            self._mk_btn(card, "✕", lambda i=idx: del_cmd(i),
                         bg=CARD, fg=WARN, font=FONT_SM, padx=10).pack(side="right", fill="y")
            self._bind_hover([card, body, lbl], CARD, CARD_HI)

    def _open_projects(self):
        ProjectManagerDialog(self, self._store, lambda: None)

    def _open_settings(self):
        SettingsDialog(self, self._store, self._apply_settings)

    def _apply_settings(self):
        self._user_name = self._store.get_user_name()
        self.title(f"Auto Weekly Report Creator — {self._user_name}")

    def _prev_week(self):
        self._dates = [d - timedelta(weeks=1) for d in self._dates]
        self._refresh()

    def _next_week(self):
        self._dates = [d + timedelta(weeks=1) for d in self._dates]
        self._refresh()

    def _prev_wk_key(self):
        return week_key(self._dates[0] - timedelta(weeks=1))

    def _carry_dd(self):
        prev = self._store.get_due_dates(self._prev_wk_key())
        cur = self._store.get_due_dates(self._wk)
        seen = {(x.get("project", ""), x["task"], x["date"]) for x in cur}
        for x in prev:
            key = (x.get("project", ""), x["task"], x["date"])
            if key not in seen:
                cur.append(dict(x))
                seen.add(key)
        self._store.set_due_dates(self._wk, cur)
        self._refresh_dd()

    def _carry_ms(self):
        prev = self._store.get_milestones(self._prev_wk_key())
        cur = self._store.get_milestones(self._wk)
        seen = {(x["project"], x["detail"], x["target"]) for x in cur}
        for x in prev:
            key = (x["project"], x["detail"], x["target"])
            if key not in seen:
                cur.append(dict(x))
                seen.add(key)
        self._store.set_milestones(self._wk, cur)
        self._refresh_ms()

    # ── Generate ────────────────────────────────────────────────────────────────

    def _generate(self):
        wk_data = self._store.full_week(self._wk)

        proj_entries = defaultdict(list)
        for dd in self._dates:
            for e in wk_data["entries"].get(dd.isoformat(), []):
                proj_entries[e["project"]].append((f"{dd.month}/{dd.day}", e["text"]))

        friday = week_friday(self._dates[0])
        total = sum(len(v) for v in proj_entries.values())

        subject = f"[weekly]{self._user_name} {friday.strftime('%y%m%d')}"
        lines = [
            f"[제목] {subject}",
            f"[받는 사람] {RECIPIENT}",
            "",
            "== 이번 주 작업 ==",
        ]
        if proj_entries:
            for proj, items in proj_entries.items():
                for tag, text in items:
                    lines.append(f"- [{proj}] {text} ({tag})")
        else:
            lines.append("(항목 없음)")

        lines += ["", "== 다음 1~2주 마감일 (Due dates) =="]
        due = wk_data.get("due_dates", [])
        lines += [f"- {self._dd_label(x)}" for x in due] if due else ["(항목 없음)"]

        lines += ["", "== 마일스톤 (Milestones) =="]
        ms = wk_data.get("milestones", [])
        lines += [f"- {x['project']}: {x['detail']} → {x['target']}" for x in ms] if ms else ["(항목 없음)"]

        bl = wk_data.get("blockers", [])
        if bl:
            lines += ["", "== Blockers =="]
            lines += [f"- {b}" for b in bl]

        out = "\n".join(lines)
        OutputDialog(self, out, subject=subject)


if __name__ == "__main__":
    App().mainloop()