import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  getNodesBounds,
  useReactFlow,
  ControlButton,
  Handle,
  Position,
  SelectionMode,
  MarkerType,
  NodeResizer,
} from '@xyflow/react';
import type { Connection, Edge, Node, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toJpeg } from 'html-to-image';
import { ArrowLeft, MousePointer2, Share2, Link2, Check, Copy, X, Trash2, FileJson, Image as ImageIcon, Sun, Moon, Undo, Redo, Clipboard, Type, Pointer, Plus, MoreVertical } from 'lucide-react';
import { projectsApi } from '../api/client';
import { useStore } from '../store/useStore';

interface ActiveUser {
  client_id: string;
  username: string;
  color: string;
}

type NodeShape = 'rectangle' | 'circle' | 'diamond' | 'triangle';

const NODE_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Indigo', value: '#4F46E5' },
  { label: 'Sky', value: '#0EA5E9' },
  { label: 'Emerald', value: '#10B981' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Rose', value: '#F43F5E' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Slate', value: '#475569' },
];

interface EditableNodeData extends Record<string, unknown> {
  label: string;
  isEditing?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  nodeWidth?: number;
  nodeHeight?: number;
  onResize?: (id: string, width: number, height: number) => void;
  nodeColor?: string;
  nodeShape?: NodeShape;
  onColorChange?: (id: string, color: string) => void;
  onShapeChange?: (id: string, shape: NodeShape) => void;
}

const EditableNode = ({ data, id, selected }: NodeProps<Node<EditableNodeData>>) => {
  const [isEditing, setIsEditing] = useState(data.isEditing || false);
  const [text, setText] = useState(data.label || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: data.nodeWidth || 140, h: data.nodeHeight || 40 });
  const shape: NodeShape = (data.nodeShape as NodeShape) || 'rectangle';
  const nodeColor = data.nodeColor || '';

  useEffect(() => {
    setIsEditing(data.isEditing || false);
  }, [data.isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setText(data.label || '');
    }
  }, [data.label, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (data.nodeWidth && data.nodeHeight) {
      setSize({ w: data.nodeWidth, h: data.nodeHeight });
    }
  }, [data.nodeWidth, data.nodeHeight]);

  const onBlur = () => {
    setIsEditing(false);
    if (data.onLabelChange) {
      data.onLabelChange(id, text);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onBlur();
    } else if (e.key === 'Escape') {
      setText(data.label || '');
      setIsEditing(false);
      if (data.onLabelChange) {
        data.onLabelChange(id, data.label || '');
      }
    }
  };

  const shapeStyles: Record<NodeShape, React.CSSProperties> = {
    rectangle: { borderRadius: '8px' },
    circle: { borderRadius: '50%' },
    diamond: { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
    triangle: { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
  };

  const isClipped = shape === 'diamond' || shape === 'triangle';
  const bgColor = nodeColor || 'var(--surface)';
  const textColor = nodeColor ? '#fff' : 'var(--text-main)';

  return (
    <div 
      ref={nodeRef}
      className={`editable-node-wrapper ${selected ? 'selected' : ''}`}
      style={{
        width: size.w,
        minHeight: size.h,
        position: 'relative',
        filter: selected ? `drop-shadow(0 0 4px ${nodeColor || 'var(--primary)'})` : 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <NodeResizer 
        color={nodeColor || "var(--primary)"} 
        isVisible={selected} 
        minWidth={80} 
        minHeight={30}
        onResize={(_, { width, height }) => {
          setSize({ w: width, h: height });
          if (data.onResize) data.onResize(id, width, height);
        }}
      />

      <div 
        className="shape-container"
        style={{
          background: bgColor,
          color: textColor,
          ...(isClipped 
            ? { border: 'none', filter: `drop-shadow(0 0 0 1px ${nodeColor || 'var(--primary)'})` } 
            : { border: `1px solid ${nodeColor || 'var(--primary)'}` }
          ),
          ...shapeStyles[shape],
        }}
      >
        <div style={{ 
          width: '100%', 
          padding: shape === 'triangle' ? '20% 10% 10% 10%' : '10px 15px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          boxSizing: 'border-box',
        }}>
          {isEditing ? (
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                fontSize: '14px',
                fontFamily: 'inherit',
                width: '100%',
                textAlign: 'center',
                outline: 'none',
              }}
            />
          ) : (
            <div style={{ 
              wordBreak: 'break-word', 
              minHeight: '1.2em', 
              width: '100%',
              textAlign: 'center',
              lineHeight: 1.2,
              fontSize: '14px',
            }}>
              {data.label || ' '}
            </div>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Top} style={{ background: 'var(--primary)', border: '2px solid #fff', zIndex: 10 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--primary)', border: '2px solid #fff', zIndex: 10 }} />
    </div>
  );
};

const nodeTypes = {
  default: EditableNode,
  editable: EditableNode,
};

type AppNode = Node<EditableNodeData>;

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useStore((state) => state.user);

  const [project, setProject] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [accessLevel, setAccessLevel] = useState('view');
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const { getNodes, screenToFlowPosition } = useReactFlow();

  const ws = useRef<WebSocket | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientId = useRef(`client_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState<{ x: number; y: number; edgeId: string } | null>(null);
  const clipboardRef = useRef<AppNode | null>(null);

  // History for Undo/Redo
  const [past, setPast] = useState<{ nodes: AppNode[]; edges: Edge[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: AppNode[]; edges: Edge[] }[]>([]);

  const broadcastAndAutoSave = useCallback((currentNodes: AppNode[], currentEdges: Edge[]) => {
    // Broadcast via WS
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'sync_graph', nodes: currentNodes, edges: currentEdges }));
    }
    // Debounced auto-save
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus('idle');
    autoSaveTimer.current = setTimeout(async () => {
      if (!id) return;
      try {
        setSaveStatus('saving');
        await projectsApi.updateGraph(id, { nodes: currentNodes, edges: currentEdges });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error('Auto-save failed', e);
        setSaveStatus('idle');
      }
    }, 1500);
  }, [id]);

  const takeSnapshot = useCallback(() => {
    setPast(prev => {
      // Limit history to 50 steps
      const newSnapshot = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
      const newPast = [...prev, newSnapshot];
      return newPast.slice(-50);
    });
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    setFuture(prev => [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }, ...prev]);
    setPast(newPast);

    setNodes(previous.nodes);
    setEdges(previous.edges);
    broadcastAndAutoSave(previous.nodes, previous.edges);
  }, [past, nodes, edges, setNodes, setEdges, broadcastAndAutoSave]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setPast(prev => [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
    setFuture(newFuture);

    setNodes(next.nodes);
    setEdges(next.edges);
    broadcastAndAutoSave(next.nodes, next.edges);
  }, [future, nodes, edges, setNodes, setEdges, broadcastAndAutoSave]);

  // Determine if the current user can edit
  const isOwner = user && project && user.id === project.owner_id;
  const canEdit = isOwner || (project?.is_public && project?.public_access_level === 'edit');

  // Initial Data Load
  useEffect(() => {
    if (id) {
      projectsApi.getById(id).then(res => {
        setProject(res.data);
        setIsPublic(res.data.is_public || false);
        setAccessLevel(res.data.public_access_level || 'view');
        if (res.data.graph_data?.nodes) {
          setNodes(res.data.graph_data.nodes as AppNode[]);
          setEdges(res.data.graph_data.edges || []);
        }
      }).catch(() => {
        // Access denied or project not found
        navigate('/');
      });
    }
  }, [id, setNodes, setEdges, navigate]);

  // WebSocket Sync Setup
  useEffect(() => {
    if (!id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const username = user?.profile_data?.name || user?.email || 'Гость';
    const wsUrl = `${protocol}//${window.location.host}/ws/${id}?client_id=${encodeURIComponent(clientId.current)}&username=${encodeURIComponent(username)}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'sync_graph') {
          setNodes(data.nodes as AppNode[]);
          setEdges(data.edges);
        } else if (data.type === 'presence') {
          setActiveUsers(data.users || []);
        }
      } catch (err) {
        console.error("WS Parse error", err);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [id, user, setNodes, setEdges]);

  // Handle local connections
  const onConnect = useCallback(
    (params: Edge | Connection) => {
      takeSnapshot();
      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      broadcastAndAutoSave(nodes, newEdges);
    },
    [setEdges, edges, nodes, takeSnapshot, broadcastAndAutoSave]
  );

  const onLabelChange = useCallback((nodeId: string, newLabel: string) => {
    setNodes((nds) => {
      const node = nds.find((n) => n.id === nodeId);
      if (node && node.data.label === newLabel) {
        // Same label — just clear editing mode
        return nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isEditing: false } } : n);
      }

      takeSnapshot();
      const nextNodes = nds.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, label: newLabel, isEditing: false } };
        }
        return n;
      });
      broadcastAndAutoSave(nextNodes, edges);
      return nextNodes;
    });
  }, [edges, broadcastAndAutoSave, takeSnapshot, setNodes]);
 
  const onColorChange = useCallback((nodeId: string, color: string) => {
    takeSnapshot();
    setNodes((nds) => {
      const nextNodes = nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, nodeColor: color } } : n
      );
      broadcastAndAutoSave(nextNodes, edges);
      return nextNodes;
    });
  }, [edges, broadcastAndAutoSave, takeSnapshot, setNodes]);

  const onShapeChange = useCallback((nodeId: string, shape: NodeShape) => {
    takeSnapshot();
    setNodes((nds) => {
      const nextNodes = nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, nodeShape: shape } } : n
      );
      broadcastAndAutoSave(nextNodes, edges);
      return nextNodes;
    });
  }, [edges, broadcastAndAutoSave, takeSnapshot, setNodes]);

  const addNode = () => {
    takeSnapshot();
    
    // Center of the viewport
    const { x: vX, y: vY } = screenToFlowPosition({ 
      x: window.innerWidth / 2, 
      y: window.innerHeight / 2 
    });

    const newNode: AppNode = {
      id: `node_${Date.now()}`,
      type: 'editable',
      position: { x: vX - 70, y: vY - 20 }, // 70 and 20 are half of default width 140 and height 40
      data: { 
        label: `Новый узел`, 
        isEditing: true
      },
    };
    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    broadcastAndAutoSave(nextNodes, edges);
  };

  // On nodes drag/move broadcast
  const customOnNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    setTimeout(() => {
      setNodes(prev => {
        broadcastAndAutoSave(prev, edges);
        return prev;
      });
    }, 50);
  }, [onNodesChange, edges, broadcastAndAutoSave]);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!canEdit) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) {
          return { ...n, data: { ...n.data, isEditing: true } };
        }
        return n;
      })
    );
  }, [canEdit, setNodes]);

  // Context menu handler
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    if (!canEdit) return;
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, [canEdit]);

  // Delete a node and its connected edges
  const deleteNode = useCallback((nodeId: string) => {
    takeSnapshot();
    const nextNodes = nodes.filter(n => n.id !== nodeId);
    const nextEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    broadcastAndAutoSave(nextNodes, nextEdges);
    setContextMenu(null);
    setEdgeContextMenu(null);
  }, [nodes, edges, setNodes, setEdges, takeSnapshot, broadcastAndAutoSave]);

  const deleteEdge = useCallback((edgeId: string) => {
    takeSnapshot();
    const nextEdges = edges.filter(e => e.id !== edgeId);
    setEdges(nextEdges);
    broadcastAndAutoSave(nodes, nextEdges);
    setEdgeContextMenu(null);
  }, [nodes, edges, setEdges, takeSnapshot, broadcastAndAutoSave]);

  const setEdgeMarkers = useCallback((edgeId: string, type: 'none' | 'source' | 'target' | 'both') => {
    takeSnapshot();
    const nextEdges = edges.map(e => {
      if (e.id === edgeId) {
        return {
          ...e,
          markerStart: (type === 'source' || type === 'both') ? { type: MarkerType.ArrowClosed } : undefined,
          markerEnd: (type === 'target' || type === 'both') ? { type: MarkerType.ArrowClosed } : undefined
        };
      }
      return e;
    });
    setEdges(nextEdges);
    broadcastAndAutoSave(nodes, nextEdges);
    setEdgeContextMenu(null);
  }, [nodes, edges, setEdges, takeSnapshot, broadcastAndAutoSave]);

  // Edge context menu handler
  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    if (!canEdit) return;
    setEdgeContextMenu({ x: event.clientX, y: event.clientY, edgeId: edge.id });
    setContextMenu(null);
  }, [canEdit]);

  // Node resize handler
  const onNodeResize = useCallback((nodeId: string, width: number, height: number) => {
    takeSnapshot();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, nodeWidth: width, nodeHeight: height } }
          : n
      )
    );
    // Defer broadcast to pick up latest nodes
    setTimeout(() => {
      setNodes(prev => {
        broadcastAndAutoSave(prev, edges);
        return prev;
      });
    }, 50);
  }, [edges, takeSnapshot, setNodes, broadcastAndAutoSave]);

  // Copy a node to clipboard
  const copyNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      clipboardRef.current = JSON.parse(JSON.stringify(node));
    }
    setContextMenu(null);
  }, [nodes]);

  // Paste node from clipboard
  const pasteNode = useCallback(() => {
    if (!clipboardRef.current || !canEdit) return;
    takeSnapshot();
    const original = clipboardRef.current;
    const newNode: AppNode = {
      ...JSON.parse(JSON.stringify(original)),
      id: `node_${Date.now()}`,
      type: 'editable',
      position: { x: original.position.x + 50, y: original.position.y + 50 },
      data: { ...original.data, isEditing: false }
    };
    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    broadcastAndAutoSave(nextNodes, edges);
  }, [nodes, edges, setNodes, canEdit, takeSnapshot, broadcastAndAutoSave]);

  // Keyboard shortcuts: Ctrl+C, Ctrl+V, Delete/Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canEdit) return;
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Copy selected node
        const selected = nodes.find(n => n.selected);
        if (selected) {
          clipboardRef.current = JSON.parse(JSON.stringify(selected));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        pasteNode();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = nodes.find(n => n.selected);
        if (selected) {
          deleteNode(selected.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canEdit, nodes, pasteNode, deleteNode]);

  // Close context menu on click anywhere
  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setEdgeContextMenu(null);
    setShowProjectMenu(false);
  }, []);

  // Share settings
  const handleShareUpdate = async () => {
    if (!id) return;
    try {
      const res = await projectsApi.updateShare(id, { is_public: isPublic, public_access_level: accessLevel });
      setProject(res.data);
    } catch (e) {
      console.error('Share update failed', e);
    }
  };

  const handleTitleSave = async () => {
    if (!project || !id || !tempTitle.trim() || tempTitle === project.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      setSaveStatus('saving');
      const res = await projectsApi.update(id, { title: tempTitle.trim() });
      setProject(res.data);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Title update failed', e);
      alert('Не удалось переименовать проект');
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') setIsEditingTitle(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export board as .graphboard file
  const handleExport = () => {
    if (!project) return;
    const exportData = {
      format: 'graphboard',
      version: 1,
      title: project.title,
      graph_data: { nodes, edges },
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title}.graphboard`;
    a.click();
    URL.revokeObjectURL(url);
    setShowProjectMenu(false);
  };

  const handleExportImage = async (type: 'png' | 'jpeg') => {
    const nodes = getNodes();
    const element = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!element || nodes.length === 0 || !project) return;

    // Save original inline styles so we can restore them after capture
    const edgePaths = element.querySelectorAll('.react-flow__edge path');
    const savedStyles: { el: HTMLElement; stroke: string; strokeWidth: string }[] = [];

    try {
      setSaveStatus('saving');

      // CRITICAL FIX: html-to-image cannot resolve CSS custom properties
      // (like --xy-edge-stroke) when cloning DOM. We must inline the 
      // computed stroke styles on every SVG edge path before capture.
      edgePaths.forEach((path) => {
        const el = path as HTMLElement;
        const computed = window.getComputedStyle(el);
        savedStyles.push({
          el,
          stroke: el.style.stroke,
          strokeWidth: el.style.strokeWidth,
        });
        // Set inline styles from computed values
        el.style.stroke = computed.stroke || (theme === 'dark' ? '#b1b1b7' : '#b1b1b7');
        el.style.strokeWidth = computed.strokeWidth || '2';
      });

      const nodesBounds = getNodesBounds(nodes);
      const width = 1920;
      const height = 1080;
      
      const zoom = Math.min(
        (width - 150) / nodesBounds.width, 
        (height - 150) / nodesBounds.height, 
        1.5
      );
      
      const offsetX = (width / 2) - (nodesBounds.x + nodesBounds.width / 2) * zoom;
      const offsetY = (height / 2) - (nodesBounds.y + nodesBounds.height / 2) * zoom;

      const options = {
        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
        width,
        height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
          background: theme === 'dark' ? '#0f172a' : '#ffffff',
        },
      };

      const dataUrl = type === 'png' ? await toPng(element, options) : await toJpeg(element, options);
      
      const link = document.createElement('a');
      link.download = `${project.title}.${type === 'jpeg' ? 'jpg' : 'png'}`;
      link.href = dataUrl;
      link.click();
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Export failed', err);
      alert('Ошибка при экспорте изображения');
    } finally {
      // Restore original inline styles so the UI isn't permanently modified
      savedStyles.forEach(({ el, stroke, strokeWidth }) => {
        el.style.stroke = stroke;
        el.style.strokeWidth = strokeWidth;
      });
      setShowProjectMenu(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    if (window.confirm(`Вы уверены, что хотите полностью удалить проект "${project.title}"?`)) {
      try {
        await projectsApi.delete(project.id);
        navigate('/');
      } catch (err) {
        console.error(err);
        alert('Ошибка при удалении проекта');
      }
    }
  };

  // Compute other users (filter out self)
  const otherUsers = activeUsers.filter((u: ActiveUser) => u.client_id !== clientId.current);

  // Decorate nodes with callbacks
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onLabelChange,
        onResize: onNodeResize,
        onColorChange,
        onShapeChange,
      }
    }));
  }, [nodes, onLabelChange, onNodeResize, onColorChange, onShapeChange]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="header" style={{ height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/')} className="btn-icon">
            <ArrowLeft size={18} />
          </button>
          {isEditingTitle ? (
            <input
              autoFocus
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="project-title-input"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--primary)',
                borderRadius: '4px',
                color: 'var(--text-main)',
                fontSize: '1.25rem',
                fontWeight: 600,
                padding: '2px 8px',
                outline: 'none',
                width: 'auto',
                minWidth: '200px'
              }}
            />
          ) : (
            <h3 
              onClick={() => { if (canEdit) { setIsEditingTitle(true); setTempTitle(project?.title || ''); } }}
              style={{ 
                margin: 0, 
                cursor: canEdit ? 'pointer' : 'default',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
              className="project-title-h3"
            >
              {project?.title || 'Загрузка...'}
            </h3>
          )}
          {saveStatus === 'saving' && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', animation: 'pulse 1s infinite' }}>Сохранение...</span>}
          {saveStatus === 'saved' && <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ Сохранено</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Active users badges */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {otherUsers.map((u: ActiveUser, i: number) => (
              <div
                key={u.client_id}
                title={u.username}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  backgroundColor: u.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                  border: '2px solid var(--bg-color)',
                  marginLeft: i > 0 ? '-8px' : '0',
                  zIndex: otherUsers.length - i,
                  cursor: 'default'
                }}
              >
                {u.username.charAt(0).toUpperCase()}
              </div>
            ))}
            {otherUsers.length > 0 && (
              <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {otherUsers.length} онлайн
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              className="btn-icon" 
              style={{ padding: '8px', border: 'none', background: 'transparent' }}
              title={theme === 'dark' ? "Светлая тема" : "Темная тема"}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {canEdit && (
              <button 
                onClick={addNode} 
                className="btn btn-secondary btn-icon" 
                title="Добавить узел"
                style={{ width: '40px', height: '40px', padding: 0, justifyContent: 'center' }}
              >
                <Plus size={18} />
              </button>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowProjectMenu(!showProjectMenu)} 
              className="btn-icon" 
              title="Меню проекта"
              style={{ padding: '8px', border: 'none', background: 'transparent' }}
            >
              <MoreVertical size={18} />
            </button>

            {showProjectMenu && (
              <div 
                className="glass-panel" 
                style={{ 
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  width: '220px', padding: '8px', zIndex: 100,
                  display: 'flex', flexDirection: 'column', gap: '2px',
                  animation: 'fadeIn 0.15s ease-out'
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '6px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Экспорт</div>
                <button 
                  className="btn-icon" 
                  style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px', gap: '10px' }} 
                  onClick={() => { handleExport(); setShowProjectMenu(false); }}
                >
                  <FileJson size={14} /> .graphboard (JSON)
                </button>
                <button 
                  className="btn-icon" 
                  style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px', gap: '10px' }} 
                  onClick={() => { handleExportImage('png'); setShowProjectMenu(false); }}
                >
                  <ImageIcon size={14} /> PNG изображение
                </button>
                <button 
                  className="btn-icon" 
                  style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px', gap: '10px' }} 
                  onClick={() => { handleExportImage('jpeg'); setShowProjectMenu(false); }}
                >
                  <ImageIcon size={14} /> JPG изображение
                </button>

                {isOwner && (
                  <>
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                    <button 
                      className="btn-icon" 
                      style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px', gap: '10px' }} 
                      onClick={() => { setShowShareModal(true); setShowProjectMenu(false); }}
                    >
                      <Share2 size={14} /> Поделиться
                    </button>
                    <button 
                      className="btn-icon" 
                      style={{ justifyContent: 'flex-start', padding: '8px 12px', width: '100%', borderRadius: '6px', gap: '10px', color: '#ff4d4f' }} 
                      onClick={() => { handleDelete(); setShowProjectMenu(false); }}
                    >
                      <Trash2 size={14} /> Удалить проект
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flow-wrapper" style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={canEdit ? customOnNodesChange : undefined}
          onEdgesChange={canEdit ? onEdgesChange : undefined}
          onConnect={canEdit ? onConnect : undefined}
          onNodeDragStart={canEdit ? () => takeSnapshot() : undefined}
          onNodesDelete={canEdit ? () => takeSnapshot() : undefined}
          onEdgesDelete={canEdit ? () => takeSnapshot() : undefined}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          nodesDraggable={!!canEdit}
          nodesConnectable={!!canEdit}
          elementsSelectable={!!canEdit}
          selectionOnDrag={selectionMode}
          selectionMode={selectionMode ? SelectionMode.Partial : undefined}
          panOnDrag={selectionMode ? [2] : [0]}
          fitView
          colorMode={theme}
          deleteKeyCode={null}
        >
          <Controls>
            <ControlButton
              onClick={() => setSelectionMode(!selectionMode)}
              title={selectionMode ? 'Режим перемещения' : 'Режим выделения области'}
              className={selectionMode ? 'selection-mode-active' : ''}
            >
              {selectionMode ? <MousePointer2 size={14} /> : <Pointer size={14} />}
            </ControlButton>
            <ControlButton
              onClick={() => { if (past.length > 0) undo(); }}
              title="Отменить (Undo)"
              className={past.length === 0 ? 'undo-redo-disabled' : ''}
            >
              <Undo size={14} />
            </ControlButton>
            <ControlButton
              onClick={() => { if (future.length > 0) redo(); }}
              title="Повторить (Redo)"
              className={future.length === 0 ? 'undo-redo-disabled' : ''}
            >
              <Redo size={14} />
            </ControlButton>
          </Controls>
          <MiniMap nodeStrokeColor={() => '#4F46E5'} nodeColor={() => '#1E293B'} maskColor="rgba(15, 23, 42, 0.7)" />
          <Background gap={12} size={1} color="rgba(255, 255, 255, 0.1)" />
        </ReactFlow>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="node-context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button onClick={() => {
              setNodes(nds => nds.map(n => n.id === contextMenu.nodeId ? { ...n, data: { ...n.data, isEditing: true }} : n));
              setContextMenu(null);
            }}>
              <Type size={14} /> Изменить текст
            </button>
            
            <div style={{ padding: '4px 8px', borderTop: '1px solid var(--border-color)', marginTop: '4px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Цвет</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {NODE_COLORS.map(c => (
                  <button
                    key={c.label}
                    onClick={() => { onColorChange(contextMenu.nodeId, c.value); setContextMenu(null); }}
                    style={{
                      width: '20px', height: '20px', borderRadius: '4px',
                      background: c.value || 'var(--surface)',
                      border: '1px solid var(--border-color)',
                      padding: 0, cursor: 'pointer'
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div style={{ padding: '4px 8px', borderTop: '1px solid var(--border-color)', marginTop: '4px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Форма</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => { onShapeChange(contextMenu.nodeId, 'rectangle'); setContextMenu(null); }}
                  style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
                  title="Прямоугольник"
                >
                  <div style={{ width: '14px', height: '10px', border: '1px solid currentColor', borderRadius: '1px' }} />
                </button>
                <button 
                  onClick={() => { onShapeChange(contextMenu.nodeId, 'circle'); setContextMenu(null); }}
                  style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
                  title="Круг"
                >
                  <div style={{ width: '12px', height: '12px', border: '1px solid currentColor', borderRadius: '50%' }} />
                </button>
                <button 
                  onClick={() => { onShapeChange(contextMenu.nodeId, 'diamond'); setContextMenu(null); }}
                  style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
                  title="Ромб"
                >
                  <div style={{ width: '10px', height: '10px', border: '1px solid currentColor', transform: 'rotate(45deg)', margin: '1px' }} />
                </button>
                <button 
                  onClick={() => { onShapeChange(contextMenu.nodeId, 'triangle'); setContextMenu(null); }}
                  style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
                  title="Треугольник"
                >
                  <div style={{ 
                    width: 0, height: 0, 
                    borderLeft: '7px solid transparent', 
                    borderRight: '7px solid transparent', 
                    borderBottom: '12px solid currentColor',
                    margin: '1px'
                  }} />
                </button>
              </div>
            </div>

            <button onClick={() => copyNode(contextMenu.nodeId)} style={{ borderTop: '1px solid var(--border-color)', marginTop: '4px' }}>
              <Clipboard size={14} /> Копировать
            </button>
            <button onClick={() => deleteNode(contextMenu.nodeId)} className="context-menu-danger">
              <Trash2 size={14} /> Удалить
            </button>
          </div>
        )}

        {/* Edge Context Menu */}
        {edgeContextMenu && (
          <div
            className="node-context-menu"
            style={{ top: edgeContextMenu.y, left: edgeContextMenu.x }}
          >
            <div style={{ padding: '4px 8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Направление стрелки</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button 
                  onClick={() => setEdgeMarkers(edgeContextMenu.edgeId, 'none')}
                  style={{ justifyContent: 'flex-start', padding: '4px 8px', width: '100%', fontSize: '13px' }}
                >
                  Без стрелок
                </button>
                <button 
                  onClick={() => setEdgeMarkers(edgeContextMenu.edgeId, 'target')}
                  style={{ justifyContent: 'flex-start', padding: '4px 8px', width: '100%', fontSize: '13px' }}
                >
                  К концу (Target)
                </button>
                <button 
                  onClick={() => setEdgeMarkers(edgeContextMenu.edgeId, 'source')}
                  style={{ justifyContent: 'flex-start', padding: '4px 8px', width: '100%', fontSize: '13px' }}
                >
                  К началу (Source)
                </button>
                <button 
                  onClick={() => setEdgeMarkers(edgeContextMenu.edgeId, 'both')}
                  style={{ justifyContent: 'flex-start', padding: '4px 8px', width: '100%', fontSize: '13px' }}
                >
                  В обе стороны
                </button>
              </div>
            </div>
            <button onClick={() => deleteEdge(edgeContextMenu.edgeId)} className="context-menu-danger" style={{ borderTop: '1px solid var(--border-color)', marginTop: '4px' }}>
              <Trash2 size={14} /> Удалить линию
            </button>
          </div>
        )}

        {/* View-only banner for guests */}
        {!canEdit && project && (
          <div style={{
            position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(30, 41, 59, 0.9)', backdropFilter: 'blur(12px)',
            padding: '10px 24px', borderRadius: '12px', color: 'var(--text-muted)',
            fontSize: '0.85rem', border: '1px solid var(--border-color)'
          }}>
            👁 Режим просмотра — только чтение
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowShareModal(false)}>
          <div className="glass-panel" style={{
            width: '480px', padding: '32px',
            animation: 'fadeIn 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0 }}>Поделиться доской</h3>
              <button onClick={() => setShowShareModal(false)} className="btn-icon"><X size={18} /></button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border-color)' }}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => { setIsPublic(e.target.checked); }}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Доступ по ссылке</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Любой, у кого есть ссылка, сможет открыть доску</div>
                </div>
              </label>
            </div>

            {isPublic && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Что может делать пользователь с этой ссылкой:</label>
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value)}
                  className="input-field"
                  style={{ appearance: 'none', width: '100%' }}
                >
                  <option value="view">👁 Только просмотр</option>
                  <option value="edit">✏️ Просмотр и редактирование</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={copyLink} className="btn btn-secondary" style={{ flex: 1 }}>
                {copied ? <><Check size={16} /> Скопировано!</> : <><Copy size={16} /> Копировать ссылку</>}
              </button>
              <button onClick={() => { handleShareUpdate(); setShowShareModal(false); }} className="btn" style={{ flex: 1 }}>
                <Link2 size={16} /> Сохранить настройки
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
