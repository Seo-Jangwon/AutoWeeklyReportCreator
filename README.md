# Auto Weekly Report Creator

mHealthLab 주간 raw 메모를 매주 금요일 이메일 형식으로 자동 정리해주는 Windows 데스크탑 앱.

## 다운로드

**[→ 최신 버전 다운로드](../../releases/latest)**

zip 압축 해제 후 `Auto Weekly Report Creator.exe` 실행. 설치 불필요.

## 기능

### 주간보기
- 월~일 7일 달력에 프로젝트별 활동 기록
- 프로젝트(연구 주제) 등록·관리
- Due Dates / Milestones / Blockers 섹션 관리
- 금요일 날짜 자동 계산 → `[weekly]이름 YYMMDD` 제목 생성
- Generate 버튼으로 이메일 초안 생성 → 클립보드 복사 / `.txt` 저장

### 플래닝
- Due Dates·Milestones를 지남 / D-day / 임박(7일 이내) / 예정 / 날짜미정 / 완료 그룹으로 분류
- 항목별 완료 체크, 수정, 삭제
- 최근 52주 작업 기록 잔디 그래프 (날짜별 활동량 시각화)

### 데이터
- 자동 저장 (`%APPDATA%\AutoWeeklyReportCreator\data.json`)
- Due Dates·Milestones는 주차와 무관하게 전역 관리

## 출력 형식

```
[제목] [weekly]서장원 260606
[받는 사람] jhlee0804@gmail.com

== 이번 주 작업 ==
- [주제] 한 일 (6/5)

== 다음 1~2주 마감일 (Due dates) ==
- [주제] 할 일 → 6/12

== 마일스톤 (Milestones) ==
- 주제: 마일스톤 내용 → 6월말

== Blockers ==
- 내용
```

## 소스에서 빌드

```bash
npm install
npm run dist:win
# → release/Auto-Weekly-Report-Creator-x.x.x-win-x64.zip
```

**개발 서버 실행:**
```bash
npm run dev
```

## 기술 스택

- Electron + React + Vite
- Catppuccin Mocha 팔레트
- lucide-react 아이콘
