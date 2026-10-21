#!/bin/sh
# Cria um atalho do Regente no menu de aplicativos do usuário.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$HOME/.local/share/applications"
cat > "$HOME/.local/share/applications/regente.desktop" <<DESKTOP
[Desktop Entry]
Name=Regente
Comment=Canvas para orquestrar agentes de IA
Exec=env -u ELECTRON_RUN_AS_NODE "$DIR/node_modules/.bin/electron" "$DIR"
Icon=$DIR/src/assets/icon.png
Terminal=false
Type=Application
Categories=Development;
DESKTOP
echo "Atalho criado: ~/.local/share/applications/regente.desktop"
