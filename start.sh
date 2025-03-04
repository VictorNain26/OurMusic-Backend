#!/bin/sh
set -ex
echo "Démarrage de Lightpanda en mode CDP sur le port 9222..."
lightpanda serve --host 127.0.0.1 --port 9222 &
echo "Lightpanda lancé, démarrage de l'application Bun..."
exec bun index.js
