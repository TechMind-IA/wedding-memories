#!/bin/bash
# Start WhatsApp bridge and webhook listener together

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE_DIR="$SCRIPT_DIR/whatsapp-bridge"

echo "========================================="
echo "  Wedding Memories - WhatsApp Agent"
echo "========================================="

# Check if bridge binary exists
if [ ! -f "$BRIDGE_DIR/whatsapp-bridge" ]; then
    echo "Bridge binary not found. Building..."
    cd "$BRIDGE_DIR" && go build -o whatsapp-bridge .
    if [ $? -ne 0 ]; then
        echo "Failed to build bridge"
        exit 1
    fi
fi

echo ""
echo "Starting services..."
echo ""

# Start bridge in background
echo "[1/2] Starting WhatsApp bridge..."
cd "$BRIDGE_DIR" && ./whatsapp-bridge &
BRIDGE_PID=$!

# Wait for bridge to start
sleep 3

# Start webhook listener in background
echo "[2/2] Starting webhook listener..."
python3 "$SCRIPT_DIR/webhook-listener.py" &
LISTENER_PID=$!

echo ""
echo "========================================="
echo "  All services running!"
echo "========================================="
echo ""
echo "Bridge PID: $BRIDGE_PID"
echo "Listener PID: $LISTENER_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BRIDGE_PID 2>/dev/null
    kill $LISTENER_PID 2>/dev/null
    echo "Done!"
}
trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait
