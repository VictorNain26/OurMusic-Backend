#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📡 Attente de la base de données PostgreSQL...${NC}"
until pg_isready -h db -p 5432; do
  echo -e "${YELLOW}⏳ Base de données pas encore prête, nouvelle tentative dans 2s...${NC}"
  sleep 2
done
echo -e "${GREEN}✅ Base de données accessible.${NC}"

echo -e "${YELLOW}📂 Exécution des migrations Drizzle ORM...${NC}"
if bun run db:push; then
  echo -e "${GREEN}✅ Migrations appliquées avec succès.${NC}"
else
  echo -e "${RED}❌ Erreur lors de l'application des migrations Drizzle.${NC}"
  exit 1
fi

echo -e "${YELLOW}🚀 Démarrage du serveur OurMusic Backend...${NC}"
bun run start
