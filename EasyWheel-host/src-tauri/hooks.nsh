# hooks.nsh

!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "Installing optional EasyWheel components..."

  # 1. Copy Browser Extension folder into the installation directory
  SetOutPath "$INSTDIR\Browser Extension"
  File /r "..\..\..\..\..\..\extensions\easywheel-browser\*.*"

  # 2. Try automatic installation of After Effects CEP extension
  # Target location: %APPDATA%\Adobe\CEP\extensions\EasyWheelAE
  DetailPrint "Checking for Adobe CEP extensions directory..."
  IfFileExists "$APPDATA\Adobe\CEP\extensions\*.*" cep_dir_exists cep_dir_not_exists

cep_dir_exists:
  DetailPrint "CEP extensions folder found. Copying After Effects extension..."
  CreateDirectory "$APPDATA\Adobe\CEP\extensions\EasyWheelAE"
  SetOutPath "$APPDATA\Adobe\CEP\extensions\EasyWheelAE"
  File /r "..\..\..\..\..\..\bridges\after-effects\extension\*.*"

  # Verify that manifest.xml, client/, jsx/, icons/ exist
  IfFileExists "$APPDATA\Adobe\CEP\extensions\EasyWheelAE\CSXS\manifest.xml" check_client verify_failed
check_client:
  IfFileExists "$APPDATA\Adobe\CEP\extensions\EasyWheelAE\client\*.*" check_jsx verify_failed
check_jsx:
  IfFileExists "$APPDATA\Adobe\CEP\extensions\EasyWheelAE\jsx\*.*" check_icons verify_failed
check_icons:
  IfFileExists "$APPDATA\Adobe\CEP\extensions\EasyWheelAE\icons\*.*" verify_succeeded verify_failed

verify_succeeded:
  DetailPrint "After Effects Extension installed successfully."
  Goto end_installation

verify_failed:
  DetailPrint "Warning: After Effects Extension verification failed (critical files missing)."
  Goto show_warning

cep_dir_not_exists:
  DetailPrint "Warning: CEP extensions folder does not exist at $APPDATA\Adobe\CEP\extensions."
  Goto show_warning

show_warning:
  MessageBox MB_OK|MB_ICONEXCLAMATION "After Effects Extension could not be installed automatically.$\n$\nYou can install it later by copying the EasyWheelAE folder into:$\n%APPDATA%\Adobe\CEP\extensions\$\n$\nThe Host application has been installed successfully."
  Goto end_installation

end_installation:
!macroend
