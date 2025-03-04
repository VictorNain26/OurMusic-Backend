#!/bin/sh
echo "Démarrage de Lightpanda en mode serveur CDP sur le port 9222..."
lightpanda serve --host 127.0.0.1 --port 9222 &
echo "Démarrage de l'application Bun..."
bun index.js
