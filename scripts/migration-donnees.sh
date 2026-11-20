#!/usr/bin/env bash
# ============================================================================
# Copie des données de l'ANCIEN projet Supabase vers le NOUVEAU.
#
# Prérequis :
#   - le nouveau projet a déjà le schéma (supabase/migrations appliquées)
#   - Docker installé (recommandé) OU pg_dump/psql version 17 ou plus
#
# Usage :
#   export ANCIENNE_BASE="postgresql://postgres.xxxx:MOTDEPASSE@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
#   export NOUVELLE_BASE="postgresql://postgres.yyyy:MOTDEPASSE@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
#   ./scripts/migration-donnees.sh
#
# (Supabase > bouton "Connect" > "Session pooler" pour obtenir ces adresses.)
#
# Ce qui est copié : comptes (avec mots de passe), profils, enfants, mercredis,
# périodes de vacances, classes, emails autorisés, rôles admin, réservations,
# rendez-vous, réglages et liste d'attente active.
# Tout se fait en une seule transaction : en cas d'erreur, rien n'est importé.
# ============================================================================
set -euo pipefail

: "${ANCIENNE_BASE:?Définissez ANCIENNE_BASE, adresse de connexion du projet d origine}"
: "${NOUVELLE_BASE:?Définissez NOUVELLE_BASE (adresse de connexion du nouveau projet)}"

DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# pg_dump / psql : en local si version >= 17, sinon via Docker
if command -v pg_dump >/dev/null && [ "$(pg_dump --version | grep -oE '[0-9]+' | head -1)" -ge 17 ]; then
  PG_DUMP=(pg_dump); PSQL=(psql)
elif command -v docker >/dev/null; then
  PG_DUMP=(docker run --rm -i postgres:17 pg_dump); PSQL=(docker run --rm -i postgres:17 psql)
else
  echo "Installez Docker ou PostgreSQL 17 (pg_dump/psql)." >&2
  exit 1
fi

TABLES=(profiles children closed_periods available_wednesdays wednesday_allowed_classes
  available_holiday_periods holiday_allowed_classes holiday_period_class_mappings
  school_class_categories school_class authorized_emails user_roles
  wednesday_reservations holiday_reservations rdv global_settings waitlist)

echo "1/3 Export des comptes (auth.users, auth.identities)…"
"${PG_DUMP[@]}" "$ANCIENNE_BASE" --data-only --column-inserts --no-owner --no-privileges \
  --table=auth.users --table=auth.identities > "$WORK/auth.sql"

echo "2/3 Export des données…"
TABLE_ARGS=()
for t in "${TABLES[@]}"; do TABLE_ARGS+=(--table="public.$t"); done
"${PG_DUMP[@]}" "$ANCIENNE_BASE" --data-only --column-inserts --no-owner --no-privileges \
  "${TABLE_ARGS[@]}" | sed -E 's/^INSERT INTO public\./INSERT INTO legacy./' > "$WORK/public.sql"

echo "   $(grep -c '^INSERT INTO auth.users' "$WORK/auth.sql" || true) comptes, $(grep -c '^INSERT INTO legacy' "$WORK/public.sql" || true) lignes de données"

echo "3/3 Import dans le nouveau projet…"
cat "$DIR/supabase/migration_donnees/01_tables_anciennes.sql" \
    "$WORK/auth.sql" \
    "$WORK/public.sql" \
    "$DIR/supabase/migration_donnees/02_import.sql" \
  | "${PSQL[@]}" "$NOUVELLE_BASE" --single-transaction -v ON_ERROR_STOP=1 -q -P pager=off

echo "Terminé. Les familles se connectent sur le nouveau site avec leur mot de passe habituel."
