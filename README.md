# Auto Weekly Report Creator

mHealthLab 주간 raw 메모를 매주 금요일 이메일 형식으로 자동 정리해주는 Windows 데스크탑 앱.

## 다운로드
**[auto-weekly-report-creator.exe](https://github.com/Seo-Jangwon/AutoWeeklyReportCreator/releases/download/v1.0.0/auto-weekly-report-creator.exe)**

## 기능

- 토~금 7일 달력에 연구 주제별 활동 기록
- 프로젝트(연구 주제) 등록·관리
- Due Dates / Milestones / Blockers 섹션 관리
- 지난주 Due Dates·Milestones 이월(↩) 기능
- 금요일 날짜 자동 계산 → `[weekly]이름 YYMMDD` 제목 생성
- 클립보드 복사 / `.txt` 저장
- 데이터 자동 저장 (`%APPDATA%\AutoWeeklyReportCreator\data.json`)

## 출력 형식

```
[제목] [weekly]서장원 260606

== 이번 주 작업 ==
- [주제] 한 일

== 다음 1~2주 마감일 (Due dates) ==
- [주제] 할 일 → 6/12

== 마일스톤 (Milestones) ==
- 주제: 할 일 → 6월말

== Blockers ==
- 내용
```

## 소스에서 빌드

```bash
pip install pyinstaller
build.bat
# → dist/auto-weekly-report-creator.exe
```

