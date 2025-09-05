FROM zaproxy/zap-stable:latest

# Switch to the zap user for container security
USER zap

# Reduce JVM thread stack size to save memory
ENV JAVA_OPTS="-Xss512k"

# CMD to start ZAP in daemon mode with your configs,
# including concurrency limits for scanners
CMD ["zap.sh", "-daemon", "-host", "::", "-port", "8080", "-config", "api.addrs.addr.name=.*", "-config", "api.addrs.addr.regex=true", "-config", "api.key=yourapikey"]