
all: build

check: build
	npm run test

build:
	npm run build

pull-top:
	git pull --depth 1

restore-volatile:
	git checkout ./__cache__ ./docs
	git clean -fd ./__cache__ ./docs

commit-volatile: commit-queue
	git add -N ./__cache__ ./docs
	git commit --allow-empty -m "Automated commit from Make tool" ./__cache__ ./docs

commit-queue:
	git add -N ./queue
	git commit --allow-empty -m "Automated commit from Make tool" ./queue

merge-push:
	git pull --rebase && git push

check-clean:
	git diff --quiet || echo "Working copy is dirty."

refresh: check-clean
	git fetch origin --depth 1
	git reset --hard origin/main
