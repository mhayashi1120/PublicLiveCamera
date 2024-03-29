###
### Just utility for maintenance
###

all: build

check: build
	npm run test

build:
	npm run build

check-clean:
	git diff --quiet || echo "Working copy is dirty."

clean-working:
	@for dir in __cache__ queue docs ; do \
		git clean -f -x $${dir} ; \
	done

package-lock.json: package.json
	npm install --package-lock-only --force
