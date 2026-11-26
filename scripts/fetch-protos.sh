#!/usr/bin/env bash
# Fetches the protos the SDK generates from that the capabilities repo owns, with protofetch at the revision the
# lock pins: the releases, at their versioned path in the production directory, which never change. It runs from
# this repo's root, where protofetch's proto_out_dir and lock are relative to.
set -euo pipefail
cd "$(dirname "$0")/.."

# protofetch fetches the public protos over https, which needs no SSH agent; export PROTOFETCH_GIT_PROTOCOL=ssh
# to prefer it.
export PROTOFETCH_GIT_PROTOCOL="${PROTOFETCH_GIT_PROTOCOL:-https}"

# protofetch is taken from its releases, which need no Rust toolchain: building it with cargo re-resolves its
# dependencies to ones that can need a newer rustc than the toolchain at hand. Machines on a platform with no
# release for it build it with cargo.
PROTOFETCH_VERSION=0.1.21
if ! protofetch --version 2>/dev/null | grep -qx "protofetch $PROTOFETCH_VERSION"; then
	case "$(uname -s)/$(uname -m)" in
		Darwin/arm64) target=aarch64-apple-darwin ;;
		Darwin/x86_64) target=x86_64-apple-darwin ;;
		Linux/x86_64) target=x86_64-unknown-linux-musl ;;
		Linux/aarch64) target=aarch64-unknown-linux-musl ;;
		*) target="" ;;
	esac
	if [ -n "$target" ] && mkdir -p .tools &&
		curl -fsSL "https://github.com/coralogix/protofetch/releases/download/v$PROTOFETCH_VERSION/protofetch_$target.tar.gz" |
			tar -xz -C .tools --strip-components=1; then
		export PATH=".tools:$PATH"
	else
		cargo install protofetch --version "$PROTOFETCH_VERSION" --locked
		export PATH="${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"
	fi
fi

protofetch fetch
