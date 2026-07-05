import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from edge_nodes import run_node_scenario

if __name__ == '__main__':
    asyncio.run(run_node_scenario('NODE_002'))
