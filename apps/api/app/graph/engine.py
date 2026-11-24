from datetime import datetime
from typing import Dict, Any, List, Optional
from collections import defaultdict
import networkx as nx
from app.models.entities import CDRRecord

def build_contact_graph(
    db,
    case_id: str,
    selected_numbers: Optional[List[str]] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    min_call_count: int = 1
) -> Dict[str, Any]:
    query = db.query(CDRRecord).filter(CDRRecord.case_id == case_id)
    if start_time:
        query = query.filter(CDRRecord.event_time >= start_time)
    if end_time:
        query = query.filter(CDRRecord.event_time <= end_time)

    records = query.all()

    # Aggregate directed edges: (a, b) -> {count, duration, record_ids, timestamps}
    edge_map = defaultdict(lambda: {
        "call_count": 0,
        "total_duration": 0,
        "record_ids": [],
        "first_seen": None,
        "last_seen": None
    })

    node_appearances = defaultdict(int)

    for r in records:
        a = r.a_party
        b = r.b_party
        if not a or not b:
            continue

        pair = (a, b)
        edge = edge_map[pair]
        edge["call_count"] += 1
        edge["total_duration"] += r.duration_seconds
        if len(edge["record_ids"]) < 10:
            edge["record_ids"].append(r.id)
        if not edge["first_seen"] or r.event_time < edge["first_seen"]:
            edge["first_seen"] = r.event_time
        if not edge["last_seen"] or r.event_time > edge["last_seen"]:
            edge["last_seen"] = r.event_time

        node_appearances[a] += 1
        node_appearances[b] += 1

    # Build NetworkX DiGraph for metrics
    G = nx.DiGraph()

    for (a, b), data in edge_map.items():
        if data["call_count"] >= min_call_count:
            G.add_edge(a, b, weight=data["call_count"], duration=data["total_duration"])

    # If selected_numbers is given, filter to 1-hop or 2-hop neighborhood if graph is large
    active_nodes = set(G.nodes())
    if selected_numbers:
        sub_nodes = set(selected_numbers)
        for s in selected_numbers:
            if s in G:
                sub_nodes.update(G.predecessors(s))
                sub_nodes.update(G.successors(s))
        active_nodes = active_nodes.intersection(sub_nodes)
        G = G.subgraph(active_nodes).copy()

    # Calculate metrics
    degree_dict = dict(G.degree())
    in_degree_dict = dict(G.in_degree())
    out_degree_dict = dict(G.out_degree())
    
    try:
        betweenness = nx.betweenness_centrality(G)
    except Exception:
        betweenness = {n: 0.0 for n in G.nodes()}

    # Community detection using undirected graph
    undirected_G = G.to_undirected()
    communities = {}
    try:
        from networkx.algorithms.community import greedy_modularity_communities
        comms = list(greedy_modularity_communities(undirected_G))
        for comm_id, node_set in enumerate(comms):
            for n in node_set:
                communities[n] = comm_id
    except Exception:
        # Fallback to connected components
        for comm_id, comp in enumerate(nx.connected_components(undirected_G)):
            for n in comp:
                communities[n] = comm_id

    # Format Cytoscape / Web-friendly nodes and edges
    nodes_payload = []
    for node_id in G.nodes():
        nodes_payload.append({
            "id": node_id,
            "label": node_id,
            "degree": degree_dict.get(node_id, 0),
            "in_degree": in_degree_dict.get(node_id, 0),
            "out_degree": out_degree_dict.get(node_id, 0),
            "betweenness_centrality": round(betweenness.get(node_id, 0.0), 4),
            "community_id": communities.get(node_id, 0),
            "is_selected": bool(selected_numbers and node_id in selected_numbers)
        })

    edges_payload = []
    for u, v, data in G.edges(data=True):
        raw_edge_info = edge_map.get((u, v), {})
        edges_payload.append({
            "id": f"{u}->{v}",
            "source": u,
            "target": v,
            "call_count": data.get("weight", 1),
            "total_duration": data.get("duration", 0),
            "first_seen": raw_edge_info.get("first_seen").isoformat() if raw_edge_info.get("first_seen") else None,
            "last_seen": raw_edge_info.get("last_seen").isoformat() if raw_edge_info.get("last_seen") else None,
            "record_ids": raw_edge_info.get("record_ids", [])
        })

    return {
        "case_id": case_id,
        "nodes": nodes_payload,
        "edges": edges_payload,
        "meta": {
            "node_count": len(nodes_payload),
            "edge_count": len(edges_payload),
            "cautions": [
                "High degree represents volume of connections in supplied records, not proof of wrongdoing.",
                "Clusters are algorithmic groupings based on observed traffic."
            ]
        }
    }
