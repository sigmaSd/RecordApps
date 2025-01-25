#!/bin/sh
export LD_LIBRARY_PATH=/app/lib:$LD_LIBRARY_PATH
exec record "$@" || true
