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

echo -e "${YELLOW}📂 Vérification du fichier de configuration drizzle.config.js...${NC}"
if grep -q "dialect" drizzle.config.js; then
  echo -e "${GREEN}✅ Paramètre 'dialect' trouvé dans drizzle.config.js.${NC}"
else
  echo -e "${RED}❌ 'dialect' manquant dans drizzle.config.js. Ajoutez 'dialect: \"postgresql\"'.${NC}"
  exit 1
fi

echo -e "${YELLOW}🔍 Vérification de la présence du package drizzle-orm...${NC}"
if [ -d "node_modules/drizzle-orm" ]; then
  echo -e "${GREEN}✅ drizzle-orm est bien installé.${NC}"
else
  echo -e "${RED}❌ drizzle-orm est manquant dans node_modules. Installation...${NC}"
  bun install --no-cache
fi

echo -e "${YELLOW}📂 Exécution des migrations Drizzle ORM...${NC}"
if bun run db:push; then
  echo -e "${GREEN}✅ Migrations appliquées avec succès.${NC}"
else
  echo -e "${RED}❌ Erreur lors de l'application des migrations Drizzle.${NC}"
  exit 1
fi

# 🌱 Seed de l'admin uniquement si nécessaire
echo -e "${YELLOW}🌱 Vérification/Création de l'utilisateur admin...${NC}"
if bun run seed:admin; then
  echo -e "${GREEN}✅ Vérification/création admin terminée avec succès.${NC}"
else
  echo -e "${RED}❌ Erreur lors de la création de l'utilisateur admin.${NC}"
  exit 1
fi

echo -e "${YELLOW}🚀 Démarrage du serveur OurMusic Backend...${NC}"
bun run start
