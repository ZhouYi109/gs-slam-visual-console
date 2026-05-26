!macro customInit
  # Force kill any running instances of the Electron app to prevent "file in use" errors
  nsExec::ExecToStack 'taskkill /F /IM "SLAM-3DGS控制台.exe"'
  
  # Force kill any orphaned python bridge processes to prevent "port 8000 in use" errors
  nsExec::ExecToStack 'taskkill /F /IM "python.exe"'
!macroend
