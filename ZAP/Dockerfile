FROM zaproxy/zap-stable:latest
USER zap
CMD ["zap.sh", "-daemon", "-host", "::", "-port", "8080", "-config", "api.addrs.addr.name=.*", "-config", "api.addrs.addr.regex=true", "-config", "api.key=yourapikey"]
