@echo off
echo 正在初始化测试数据...
cd /d %~dp0
call npx tsx src/scripts/init-data.ts
pause
