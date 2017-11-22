.DEFAULT_GOAL:= build
MAKEFLAGS = -j1
PATH := ./node_modules/.bin:$(PATH)
SHELL := /bin/bash
args = $(filter-out $@, $(MAKECMDGOALS))
.PHONY: all install clean deep-clean reinstall setup build compile build-source-maps compile-source-maps docs docs-server docs-build docs-compile watch lint test coverage test-coverage code-coverage report-coverage report-code-coverage ci prepatch patch minor major publish release

all: build test

install:
	@npm install

# remove the build and log folders
clean:
	@rm -rf dist logs

# remove all files that are ignored by git
deep-clean:
	@make clean
	@rm -rf node_modules/ dist/ .nyc_output/ npm-debug.log yarn-error.log

# reinstall the node_modules and start with a fresh node build
reinstall setup:
	@make deep-clean
	@make install

# build the source files
build compile:
	@make clean
	@babel app --source-maps --out-dir dist $(args)

# When watching for changes we can assume it's a development env
# so build files with source maps
watch:
	@babel app --source-maps --out-dir dist --watch

# lint test files
lint:
	@eslint app

# start the node process
start:
		@nodemon -e js,pug -w dist dist/test.js;
# run unit tests
test:
	@ava $(args)

# The command the ci server runs
ci:
	@make lint || exit 1
	# if the tests fail then it will exit with an error

publish release:
	@make reinstall
	@make ci || exit 1
	# rebuild project without sourcemaps
	@make build
	@np --no-cleanup --yolo $(args)
