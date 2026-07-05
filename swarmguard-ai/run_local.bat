@echo off
echo =======================================================
echo          SwarmGuard AI - Local Prototype Starter
echo =======================================================
echo.
echo Starting Mesh Relay (ws://localhost:8765)...
start "Mesh Relay" cmd /c "python -m mesh_network.mesh_relay"

echo Starting Swarm Box API (http://localhost:8010)...
start "Swarm Box Server" cmd /c "uvicorn swarm_box.app:app --host localhost --port 8010"

echo Waiting 3 seconds for servers to initialize...
timeout /t 3 /nobreak >nul

echo Starting Edge Node Simulators...
start "Edge Node 1" cmd /c "python -m edge_nodes.node_1"
start "Edge Node 2" cmd /c "python -m edge_nodes.node_2"
start "Edge Node 3" cmd /c "python -m edge_nodes.node_3"
start "Edge Node 4" cmd /c "python -m edge_nodes.node_4"
start "Edge Node 5" cmd /c "python -m edge_nodes.node_5"

echo.
echo Starting Dormant Cloud Sync API (http://localhost:8080)...
start "Cloud Sync (Dormant)" cmd /c "uvicorn cloud_layer.sync_api:app --host localhost --port 8080"

echo.
echo =======================================================
echo All services launched!
echo Opening Swarm Box Dashboard...
start http://localhost:8010
echo =======================================================
pause
