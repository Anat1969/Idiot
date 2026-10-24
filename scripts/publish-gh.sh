#!/usr/bin/env bash
# מפרסם את הבנייה לענף gh-pages בגיטהאב, כדי לצפות באפליקציה גם כש-Vercel לא זמין.
# כתובות: https://raw.githack.com/Anat1969/Idiot/gh-pages/index.html  (וגם GitHub Pages, אם הופעל בהגדרות)
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
SHA=$(git rev-parse --short HEAD)
TMP=$(mktemp -d)
cp -r dist/. "$TMP"/
touch "$TMP/.nojekyll"
echo "build of $SHA, $(date -u +%Y-%m-%dT%H:%MZ)" > "$TMP/version.txt"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="${GIT_AUTHOR_NAME:-Claude}" -c user.email="${GIT_AUTHOR_EMAIL:-noreply@anthropic.com}" commit -q -m "Publish build of $SHA"
git push -q -f "$(git -C "$OLDPWD" remote get-url origin)" gh-pages
echo "published $SHA to gh-pages"
