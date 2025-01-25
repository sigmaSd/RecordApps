#!/bin/sh
# https://discourse.gnome.org/t/how-to-fix-evolution-not-starting-after-update/25389
WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1 exec record "$@" || true
