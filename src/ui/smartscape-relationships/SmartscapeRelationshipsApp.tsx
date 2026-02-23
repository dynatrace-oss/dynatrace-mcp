import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App } from '@modelcontextprotocol/ext-apps';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Button } from '@dynatrace/strato-components/buttons';
import { Text } from '@dynatrace/strato-components/typography';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components-preview/tables';
import { ToggleButtonGroup } from '@dynatrace/strato-components-preview/forms';
import { Tooltip } from '@dynatrace/strato-components-preview/overlays';
import { DocumentStackIcon, RefreshIcon } from '@dynatrace/strato-icons';
import { LoadingState, ErrorState } from '../components';
import { createNotebooksURL } from '../../utils/environment-url-parser';

const DEFAULT_PAGE_SIZE = 10;
const GRAPH_WIDTH = 1000;
const GRAPH_HEIGHT = 560;

type RelationshipsViewMode = 'graph' | 'tree' | 'table';

interface SmartscapeEdge {
  sourceId: string;
  targetId: string;
  relationship: string;
}

interface SmartscapeNode {
  id: string;
  name: string;
  type?: string;
}

interface SmartscapeRelationshipsMeta {
  centralEntityId?: string;
  centralEntityName?: string;
  edges?: SmartscapeEdge[];
  nodes?: SmartscapeNode[];
  inbound?: number;
  outbound?: number;
  environmentUrl?: string;
  edgeQuery?: string;
}

interface RelationshipsState {
  status: 'loading' | 'error' | 'success';
  errorMessage?: string;
  centralEntityId?: string;
  centralEntityName?: string;
  edges: SmartscapeEdge[];
  nodes: SmartscapeNode[];
  inbound: number;
  outbound: number;
  environmentUrl?: string;
  edgeQuery?: string;
}

interface TreeItem {
  id: string;
  name: string;
  type: string;
  relationship: string;
}

interface GraphNodeLayout {
  id: string;
  label: string;
  x: number;
  y: number;
  isCentral: boolean;
}

function isTextContent(content: unknown): content is { type: 'text'; text: string } {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    (content as { type: string }).type === 'text' &&
    'text' in content
  );
}

function toState(meta: SmartscapeRelationshipsMeta | undefined): RelationshipsState {
  if (!meta) {
    return {
      status: 'error',
      errorMessage: 'No Smartscape relationship metadata received.',
      edges: [],
      nodes: [],
      inbound: 0,
      outbound: 0,
    };
  }

  return {
    status: 'success',
    centralEntityId: meta.centralEntityId,
    centralEntityName: meta.centralEntityName,
    edges: meta.edges ?? [],
    nodes: meta.nodes ?? [],
    inbound: meta.inbound ?? 0,
    outbound: meta.outbound ?? 0,
    environmentUrl: meta.environmentUrl,
    edgeQuery: meta.edgeQuery,
  };
}

function asSafeLabel(value: string): string {
  return value.length > 38 ? `${value.slice(0, 35)}...` : value;
}

function spreadPositions(count: number, min: number, max: number): number[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [(min + max) / 2];
  }

  const span = max - min;
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, index) => min + index * step);
}

export function SmartscapeRelationshipsApp() {
  const [viewMode, setViewMode] = useState<RelationshipsViewMode>('graph');
  const [state, setState] = useState<RelationshipsState>({
    status: 'loading',
    edges: [],
    nodes: [],
    inbound: 0,
    outbound: 0,
  });
  const appRef = useRef<App | null>(null);
  const [toolArguments, setToolArguments] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const app = new App({ name: 'Smartscape Relationships Viewer', version: '1.0.0' });
    appRef.current = app;
    app.connect();

    app.ontoolinput = (params) => {
      setToolArguments(params.arguments ?? null);
    };

    app.ontoolresult = (result) => {
      const textContent = result.content?.find(isTextContent);
      const meta = result._meta as SmartscapeRelationshipsMeta | undefined;
      if (!meta && textContent?.text) {
        setState({
          status: 'error',
          errorMessage: textContent.text,
          edges: [],
          nodes: [],
          inbound: 0,
          outbound: 0,
        });
        return;
      }
      setState(toState(meta));
    };

    return () => {
      app.ontoolinput = undefined;
      app.ontoolresult = undefined;
      app.close();
      appRef.current = null;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!appRef.current || !toolArguments) return;

    setState({
      status: 'loading',
      edges: [],
      nodes: [],
      inbound: 0,
      outbound: 0,
    });

    try {
      const result = await appRef.current.callServerTool({
        name: 'investigate_smartscape_relationships',
        arguments: toolArguments,
      });

      const textContent = result.content?.find(isTextContent);
      const meta = result._meta as SmartscapeRelationshipsMeta | undefined;
      if (!meta && textContent?.text) {
        setState({
          status: 'error',
          errorMessage: textContent.text,
          edges: [],
          nodes: [],
          inbound: 0,
          outbound: 0,
        });
        return;
      }

      setState(toState(meta));
    } catch (error) {
      setState({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Refresh failed.',
        edges: [],
        nodes: [],
        inbound: 0,
        outbound: 0,
      });
    }
  }, [toolArguments]);

  const handleOpenInNotebooks = useCallback(async () => {
    if (!appRef.current || !state.environmentUrl || !state.edgeQuery) return;

    const notebooksUrl = createNotebooksURL(state.environmentUrl, state.edgeQuery);
    await appRef.current.openLink({ url: notebooksUrl });
  }, [state.edgeQuery, state.environmentUrl]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, SmartscapeNode>();
    for (const node of state.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [state.nodes]);

  const edgeRows = useMemo(
    () =>
      state.edges.map((edge, index) => {
        const source = nodeMap.get(edge.sourceId)?.name ?? edge.sourceId;
        const target = nodeMap.get(edge.targetId)?.name ?? edge.targetId;

        let direction = 'transitive';
        if (state.centralEntityId && edge.sourceId === state.centralEntityId) {
          direction = 'outbound';
        } else if (state.centralEntityId && edge.targetId === state.centralEntityId) {
          direction = 'inbound';
        }

        return {
          id: `${edge.sourceId}-${edge.targetId}-${edge.relationship}-${index}`,
          source,
          relationship: edge.relationship,
          target,
          direction,
        };
      }),
    [nodeMap, state.centralEntityId, state.edges],
  );

  const centralId = state.centralEntityId;

  const inboundRows = useMemo(
    () =>
      state.edges
        .filter((edge) => !!centralId && edge.targetId === centralId)
        .map((edge) => {
          const sourceNode = nodeMap.get(edge.sourceId);
          return {
            id: edge.sourceId,
            name: sourceNode?.name ?? edge.sourceId,
            type: sourceNode?.type ?? 'Unknown',
            relationship: edge.relationship,
          } as TreeItem;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [centralId, nodeMap, state.edges],
  );

  const outboundRows = useMemo(
    () =>
      state.edges
        .filter((edge) => !!centralId && edge.sourceId === centralId)
        .map((edge) => {
          const targetNode = nodeMap.get(edge.targetId);
          return {
            id: edge.targetId,
            name: targetNode?.name ?? edge.targetId,
            type: targetNode?.type ?? 'Unknown',
            relationship: edge.relationship,
          } as TreeItem;
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [centralId, nodeMap, state.edges],
  );

  const groupedInbound = useMemo(() => {
    const map = new Map<string, TreeItem[]>();
    for (const item of inboundRows) {
      const key = item.type || 'Unknown';
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
    }
    return Array.from(map.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [inboundRows]);

  const groupedOutbound = useMemo(() => {
    const map = new Map<string, TreeItem[]>();
    for (const item of outboundRows) {
      const key = item.type || 'Unknown';
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
    }
    return Array.from(map.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [outboundRows]);

  const graphLayout = useMemo(() => {
    if (!centralId) {
      return { nodes: [] as GraphNodeLayout[], nodeById: new Map<string, GraphNodeLayout>() };
    }

    const centralNode = nodeMap.get(centralId);
    const inboundIds = Array.from(
      new Set(state.edges.filter((edge) => edge.targetId === centralId).map((edge) => edge.sourceId)),
    );
    const outboundIds = Array.from(
      new Set(state.edges.filter((edge) => edge.sourceId === centralId).map((edge) => edge.targetId)),
    );
    const sideIds = new Set<string>([...inboundIds, ...outboundIds]);

    const otherIds = Array.from(
      new Set(state.nodes.map((node) => node.id).filter((nodeId) => nodeId !== centralId && !sideIds.has(nodeId))),
    );

    const inboundY = spreadPositions(inboundIds.length, 90, GRAPH_HEIGHT - 90);
    const outboundY = spreadPositions(outboundIds.length, 90, GRAPH_HEIGHT - 90);
    const otherY = spreadPositions(otherIds.length, 110, GRAPH_HEIGHT - 110);

    const nodes: GraphNodeLayout[] = [
      {
        id: centralId,
        label: asSafeLabel(centralNode?.name ?? centralId),
        x: GRAPH_WIDTH * 0.5,
        y: GRAPH_HEIGHT * 0.5,
        isCentral: true,
      },
      ...inboundIds.map((id, index) => ({
        id,
        label: asSafeLabel(nodeMap.get(id)?.name ?? id),
        x: GRAPH_WIDTH * 0.2,
        y: inboundY[index] ?? GRAPH_HEIGHT * 0.5,
        isCentral: false,
      })),
      ...outboundIds.map((id, index) => ({
        id,
        label: asSafeLabel(nodeMap.get(id)?.name ?? id),
        x: GRAPH_WIDTH * 0.8,
        y: outboundY[index] ?? GRAPH_HEIGHT * 0.5,
        isCentral: false,
      })),
      ...otherIds.map((id, index) => ({
        id,
        label: asSafeLabel(nodeMap.get(id)?.name ?? id),
        x: GRAPH_WIDTH * 0.5,
        y: otherY[index] ?? GRAPH_HEIGHT * 0.8,
        isCentral: false,
      })),
    ];

    return {
      nodes,
      nodeById: new Map(nodes.map((node) => [node.id, node])),
    };
  }, [centralId, nodeMap, state.edges, state.nodes]);

  const edgeColumns = useMemo<DataTableColumnDef<(typeof edgeRows)[number]>[]>(
    () => [
      { id: 'source', header: 'Source', accessor: (row) => row.source },
      { id: 'relationship', header: 'Relationship', accessor: (row) => row.relationship },
      { id: 'target', header: 'Target', accessor: (row) => row.target },
      { id: 'direction', header: 'Direction', accessor: (row) => row.direction },
    ],
    [edgeRows],
  );

  const nodeRows = useMemo(
    () =>
      state.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type ?? 'Unknown',
      })),
    [state.nodes],
  );

  const nodeColumns = useMemo<DataTableColumnDef<(typeof nodeRows)[number]>[]>(
    () => [
      { id: 'name', header: 'Entity', accessor: (row) => row.name },
      { id: 'type', header: 'Type', accessor: (row) => row.type },
      { id: 'id', header: 'ID', accessor: (row) => row.id },
    ],
    [nodeRows],
  );

  if (state.status === 'loading') {
    return <LoadingState message='Loading Smartscape relationships...' />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.errorMessage ?? 'An unknown error occurred.'} />;
  }

  return (
    <Flex flexDirection='column' gap={12}>
      <Flex flexDirection='row' justifyContent='space-between' alignItems='center' gap={8} style={{ paddingLeft: 8 }}>
        <Flex flexDirection='column' gap={2}>
          <Text textStyle='base-emphasized'>{state.centralEntityName || state.centralEntityId || 'Entity'}</Text>
          {state.centralEntityId && <Text textStyle='small'>{state.centralEntityId}</Text>}
          <Text textStyle='small'>
            {state.edges.length} relationships ({state.inbound} inbound, {state.outbound} outbound)
          </Text>
        </Flex>

        <Flex flexDirection='row' gap={4} alignItems='center'>
          <ToggleButtonGroup value={viewMode} onChange={(event) => setViewMode(event as RelationshipsViewMode)}>
            <ToggleButtonGroup.Button value='graph'>Graph</ToggleButtonGroup.Button>
            <ToggleButtonGroup.Button value='tree'>Tree</ToggleButtonGroup.Button>
            <ToggleButtonGroup.Button value='table'>Table</ToggleButtonGroup.Button>
          </ToggleButtonGroup>
          <Tooltip text='Open edge query in Notebooks'>
            <Button
              variant='default'
              size='condensed'
              onClick={handleOpenInNotebooks}
              aria-label='Open edge query in Dynatrace Notebooks'
              disabled={!state.environmentUrl || !state.edgeQuery}
            >
              <Button.Prefix>
                <DocumentStackIcon />
              </Button.Prefix>
              Open in Notebooks
            </Button>
          </Tooltip>
          <Tooltip text='Refresh'>
            <Button
              variant='default'
              size='condensed'
              onClick={handleRefresh}
              aria-label='Refresh Smartscape relationships'
            >
              <Button.Prefix>
                <RefreshIcon />
              </Button.Prefix>
            </Button>
          </Tooltip>
        </Flex>
      </Flex>

      {viewMode === 'graph' && (
        <Flex flexDirection='column' gap={4}>
          <Text textStyle='base-emphasized'>Topology Graph</Text>
          <Flex
            flexDirection='column'
            gap={4}
            style={{ border: '1px solid var(--dt-color-border--default)', borderRadius: 8, padding: 8 }}
          >
            <svg
              viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
              width='100%'
              role='img'
              aria-label='Smartscape relationship graph'
            >
              <g>
                {state.edges.map((edge, index) => {
                  const source = graphLayout.nodeById.get(edge.sourceId);
                  const target = graphLayout.nodeById.get(edge.targetId);

                  if (!source || !target) {
                    return null;
                  }

                  return (
                    <line
                      key={`${edge.sourceId}-${edge.targetId}-${edge.relationship}-${index}`}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke='currentColor'
                      strokeOpacity={0.35}
                      strokeWidth={1.5}
                    />
                  );
                })}

                {graphLayout.nodes.map((node) => (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    <circle
                      r={node.isCentral ? 16 : 11}
                      fill='currentColor'
                      fillOpacity={node.isCentral ? 0.22 : 0.12}
                      stroke='currentColor'
                      strokeOpacity={0.5}
                    />
                    <text
                      textAnchor='middle'
                      y={node.isCentral ? 30 : 24}
                      fontSize={12}
                      fill='currentColor'
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.label}
                    </text>
                  </g>
                ))}
              </g>
            </svg>

            <Text textStyle='small'>
              Center node is the investigated entity. Left side shows inbound callers and right side shows outbound
              dependencies.
            </Text>
          </Flex>
        </Flex>
      )}

      {viewMode === 'tree' && (
        <Flex flexDirection='column' gap={8}>
          <Text textStyle='base-emphasized'>Relationship Tree</Text>
          <Flex flexDirection='row' gap={8} alignItems='flex-start' style={{ flexWrap: 'wrap' }}>
            <Flex
              flexDirection='column'
              gap={4}
              style={{
                border: '1px solid var(--dt-color-border--default)',
                borderRadius: 8,
                padding: 8,
                minWidth: 360,
                flex: 1,
              }}
            >
              <Text textStyle='base-emphasized'>Inbound ({inboundRows.length})</Text>
              {groupedInbound.length === 0 && <Text textStyle='small'>No inbound relationships.</Text>}
              {groupedInbound.map(([type, items]) => (
                <Flex key={type} flexDirection='column' gap={2}>
                  <Text textStyle='small-emphasized'>{type}</Text>
                  {items.map((item) => (
                    <Text key={`${item.id}-${item.relationship}`} textStyle='small'>
                      ↳ {item.name} ({item.relationship})
                    </Text>
                  ))}
                </Flex>
              ))}
            </Flex>

            <Flex
              flexDirection='column'
              gap={4}
              style={{
                border: '1px solid var(--dt-color-border--default)',
                borderRadius: 8,
                padding: 8,
                minWidth: 360,
                flex: 1,
              }}
            >
              <Text textStyle='base-emphasized'>Outbound ({outboundRows.length})</Text>
              {groupedOutbound.length === 0 && <Text textStyle='small'>No outbound relationships.</Text>}
              {groupedOutbound.map(([type, items]) => (
                <Flex key={type} flexDirection='column' gap={2}>
                  <Text textStyle='small-emphasized'>{type}</Text>
                  {items.map((item) => (
                    <Text key={`${item.id}-${item.relationship}`} textStyle='small'>
                      ↳ {item.name} ({item.relationship})
                    </Text>
                  ))}
                </Flex>
              ))}
            </Flex>
          </Flex>
        </Flex>
      )}

      {viewMode === 'table' && (
        <>
          <Flex flexDirection='column' gap={4}>
            <Text textStyle='base-emphasized'>Relationships</Text>
            <DataTable data={edgeRows} columns={edgeColumns} sortable resizable fullWidth>
              <DataTable.Pagination defaultPageSize={DEFAULT_PAGE_SIZE} />
            </DataTable>
          </Flex>

          <Flex flexDirection='column' gap={4}>
            <Text textStyle='base-emphasized'>Entities</Text>
            <DataTable data={nodeRows} columns={nodeColumns} sortable resizable fullWidth>
              <DataTable.Pagination defaultPageSize={DEFAULT_PAGE_SIZE} />
            </DataTable>
          </Flex>
        </>
      )}
    </Flex>
  );
}
