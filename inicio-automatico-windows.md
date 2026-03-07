# Auto-Start Backend on Windows

## Option 1: Startup Folder

1. `Win + R` → `shell:startup`
2. Create `start-backend.bat`
3. Content:
```bat
@echo off
cd /d "C:\Users\Administrator\Documents\Web-PRESTIGE-GOAL-MOTION"
pm2 resurrect
```

## Option 2: Task Scheduler

1. `Win + R` → `taskschd.msc`
2. Create Basic Task
3. Name: "Prestige Backend PM2"
4. Trigger: At startup
5. Action: Start program → `pm2` with args `resurrect`
