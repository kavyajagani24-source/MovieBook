import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Server,
  Activity,
  Cpu,
  Clock,
  Vote,
  Database,
  ShieldCheck,
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Layers,
  Flame,
  Radio,
  Scale,
  GitCompare
} from 'lucide-react';
import { distributedAPI, checkoutAPI, probeLoadBalancer, LOAD_BALANCER_URL } from '@/lib/api';

const DistributedDashboard = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [clocks, setClocks] = useState<any[]>([]);
  const [coordinatorId, setCoordinatorId] = useState<number>(1);
  const [rpcLogs, setRpcLogs] = useState<any[]>([]);
  const [replicationStatus, setReplicationStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Experiment 1: RPC Test State
  const [rpcMethod, setRpcMethod] = useState('getMovie');
  const [rpcParam, setRpcParam] = useState('1');
  const [rpcResponse, setRpcResponse] = useState<any>(null);
  const [isRpcLoading, setIsRpcLoading] = useState(false);

  // Experiment 2: Concurrency Test State
  const [concurrentShowId, setConcurrentShowId] = useState('1');
  const [concurrentSeat, setConcurrentSeat] = useState('A5');
  const [concurrentRequests, setConcurrentRequests] = useState('10');
  const [concurrencyResult, setConcurrencyResult] = useState<any>(null);
  const [isConcurrencyRunning, setIsConcurrencyRunning] = useState(false);

  // Experiment 3: Berkeley Clock Sync State
  const [berkeleyResult, setBerkeleyResult] = useState<any>(null);
  const [isSyncingClocks, setIsSyncingClocks] = useState(false);
  const [electionResult, setElectionResult] = useState<any>(null);
  const [isElectionRunning, setIsElectionRunning] = useState(false);

  // Experiment 5: Admin Direct Node Test
  const [targetServerId, setTargetServerId] = useState<number>(2);
  const [isTargetBookingRunning, setIsTargetBookingRunning] = useState(false);
  const [targetBookingResult, setTargetBookingResult] = useState<any>(null);

  // Fault Tolerance: which node to target for failure/promotion
  const [failoverTargetNode, setFailoverTargetNode] = useState<number>(1);

  // Load balancer
  const [lbCount, setLbCount] = useState('9');
  const [lbHits, setLbHits] = useState<any[]>([]);
  const [isLbRunning, setIsLbRunning] = useState(false);

  // Data consistency
  const [consistencyKey, setConsistencyKey] = useState('seat-A1');
  const [consistencyValue, setConsistencyValue] = useState('booked');
  const [consistencyResult, setConsistencyResult] = useState<any>(null);
  const [isConsistencyRunning, setIsConsistencyRunning] = useState(false);

  useEffect(() => {
    fetchClusterData();
    const interval = setInterval(() => {
      fetchClusterData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchClusterData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [nodesRes, clocksRes, logsRes, replRes] = await Promise.allSettled([
        distributedAPI.getNodes(),
        distributedAPI.getClocks(),
        distributedAPI.getRpcLogs(),
        distributedAPI.getReplicationStatus()
      ]);

      if (nodesRes.status === 'fulfilled') {
        setNodes(nodesRes.value.data.nodes || []);
      } else {
        setNodes([
          { nodeId: 1, role: 'SERVER', port: 5000, status: 'OFFLINE', hostname: '-', clockTime: '-', clockOffsetMs: 0 },
          { nodeId: 2, role: 'SERVER', port: 5001, status: 'OFFLINE', hostname: '-', clockTime: '-', clockOffsetMs: 0 },
          { nodeId: 3, role: 'SERVER', port: 5002, status: 'OFFLINE', hostname: '-', clockTime: '-', clockOffsetMs: 0 },
          { nodeId: 4, role: 'BACKUP', port: 5003, status: 'OFFLINE', hostname: '-', clockTime: '-', clockOffsetMs: 0, isPrimary: false }
        ]);
      }
      if (clocksRes.status === 'fulfilled') {
        setClocks(clocksRes.value.data.clocks || []);
        if (clocksRes.value.data.coordinatorId) {
          setCoordinatorId(clocksRes.value.data.coordinatorId);
        }
      }
      if (logsRes.status === 'fulfilled') {
        setRpcLogs(logsRes.value.data || []);
      }
      if (replRes.status === 'fulfilled') {
        setReplicationStatus(replRes.value.data || null);
      }
    } catch (e) {
      // Non-fatal
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // 1. Send RPC Call
  const handleSendRpc = async () => {
    setIsRpcLoading(true);
    setRpcResponse(null);
    try {
      let paramsObj: any = {};
      if (rpcMethod === 'getMovie' || rpcMethod === 'getMovieShows') {
        paramsObj = { movieId: Number(rpcParam) || 1 };
      } else if (rpcMethod === 'checkSeatAvailability') {
        paramsObj = { showId: 1, seatNo: rpcParam || 'C1' };
      } else if (rpcMethod === 'calculateBookingTotal') {
        paramsObj = { seatCount: Number(rpcParam) || 2, basePrice: 250, discountPercentage: 10 };
      }
      const resp = await distributedAPI.sendRpc(rpcMethod, paramsObj);
      setRpcResponse(resp.data);
      toast.success(`RPC '${rpcMethod}' completed via Server ${resp.data.serverId}`);
      fetchClusterData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'RPC Failed');
      setRpcResponse(err.response?.data || { error: err.message });
    } finally {
      setIsRpcLoading(false);
    }
  };

  // 2. Run Concurrent Booking Test
  const handleRunConcurrencyTest = async () => {
    setIsConcurrencyRunning(true);
    setConcurrencyResult(null);
    try {
      const resp = await distributedAPI.runConcurrencyTest({
        showId: Number(concurrentShowId) || 1,
        seat: concurrentSeat,
        requestCount: Number(concurrentRequests) || 10,
        customerId: 1
      });
      setConcurrencyResult(resp.data);
      toast.success(`Concurrency test finished: ${resp.data.successful} booked, ${resp.data.seatConflicts} conflicts detected.`);
      fetchClusterData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Concurrency test error');
    } finally {
      setIsConcurrencyRunning(false);
    }
  };

  // 3. Run Berkeley Clock Synchronization
  const handleSyncClocks = async () => {
    setIsSyncingClocks(true);
    setBerkeleyResult(null);
    try {
      const resp = await distributedAPI.syncBerkeleyClocks();
      setBerkeleyResult(resp.data);
      toast.success(`Berkeley Clock Sync complete! Average adjustment: ${resp.data.averageAdjustment}ms`);
      fetchClusterData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Berkeley Clock Sync failed');
    } finally {
      setIsSyncingClocks(false);
    }
  };

  const handleBullyElection = async () => {
    setIsElectionRunning(true);
    setElectionResult(null);
    try {
      const resp = await distributedAPI.runBullyElection();
      setElectionResult(resp.data);
      setCoordinatorId(resp.data.electedCoordinator);
      toast.success(`Bully election elected container ${resp.data.electedCoordinator}`);
      fetchClusterData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Bully election failed');
    } finally {
      setIsElectionRunning(false);
    }
  };

  const handleRingElection = async () => {
    setIsElectionRunning(true);
    setElectionResult(null);
    try {
      const resp = await distributedAPI.runRingElection();
      setElectionResult(resp.data);
      setCoordinatorId(resp.data.electedCoordinator);
      toast.success(`Ring election elected container ${resp.data.electedCoordinator}`);
      fetchClusterData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Ring election failed');
    } finally {
      setIsElectionRunning(false);
    }
  };

  // 4. Simulate Server Failure / Failover
  const handleToggleFailure = async (nodeId = failoverTargetNode, stop?: boolean) => {
    const target = nodes.find((node) => node.nodeId === nodeId);
    const shouldStop = stop ?? target?.status !== 'OFFLINE';
    try {
      await distributedAPI.simulateFailure(nodeId, shouldStop);
      toast.info(shouldStop ? `Container ${nodeId} stopped` : `Container ${nodeId} is starting`);
      fetchClusterData(true);
      if (!shouldStop) {
        setTimeout(() => fetchClusterData(true), 4000);
        setTimeout(() => fetchClusterData(true), 9000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle failure');
    }
  };

  // 7. Promote Backup Server to Primary
  const handlePromoteBackup = async () => {
    try {
      const resp = await distributedAPI.promoteBackup(4);
      toast.success(resp.data.message || 'Backup promoted to primary');
      fetchClusterData(true);
    } catch (err: any) {
      toast.error(err.message || 'Backup promotion failed');
    }
  };

  const handleProbeLoadBalancer = async () => {
    setIsLbRunning(true);
    setLbHits([]);
    try {
      const hits = await probeLoadBalancer(Number(lbCount) || 9);
      setLbHits(hits);
      const served = hits.filter((hit) => hit.ok).length;
      const backupHits = hits.filter((hit) => hit.ok && hit.nodeId === 4).length;
      const appHits = served - backupHits;
      if (served === 0) {
        toast.error('No container accepted the request. Start the backup, or start containers 1–3.');
      } else {
        toast.success(
          backupHits > 0 && appHits === 0
            ? `Failover: backup served all ${backupHits} requests. Containers 1–3 are stopped.`
            : `Load balancer served ${served} of ${hits.length}. Containers 1–3: ${appHits}. Backup: ${backupHits}.`
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Load balancer probe failed');
    } finally {
      setIsLbRunning(false);
    }
  };

  const handleConsistencyWrite = async (mode: 'strong' | 'eventual') => {
    setIsConsistencyRunning(true);
    try {
      const resp = await distributedAPI.writeConsistency({
        key: consistencyKey || 'seat-A1',
        value: consistencyValue || 'booked',
        mode
      });
      setConsistencyResult(resp.data);
      toast.success(
        mode === 'strong'
          ? `Strong write v${resp.data.version}: backup acknowledged before the response.`
          : `Eventual write v${resp.data.version}: primary committed, replica follows in ${resp.data.replicaDelayMs}ms.`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Consistency write failed');
    } finally {
      setIsConsistencyRunning(false);
    }
  };

  const handleConsistencyCompare = async () => {
    setIsConsistencyRunning(true);
    try {
      const resp = await distributedAPI.compareConsistency(consistencyKey || 'seat-A1');
      setConsistencyResult(resp.data);
      toast.success(resp.data.consistent ? 'All reachable containers agree.' : 'Containers do not all agree yet.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Consistency compare failed');
    } finally {
      setIsConsistencyRunning(false);
    }
  };

  // 8. Admin Direct Server Probe Booking
  const handleAdminDirectBooking = async () => {
    setIsTargetBookingRunning(true);
    setTargetBookingResult(null);
    try {
      const uniqueSeat = `S${Math.floor(10 + Math.random() * 89)}`;
      const resp = await checkoutAPI.create({
        show_id: 1,
        show_date: new Date().toISOString().split('T')[0],
        show_time: '18:00',
        seats: [{ seat_no: uniqueSeat, price: 250 }],
        hall_no: 1,
        t_id: 1,
        admin_id: 1,
        c_id: 1
      }, targetServerId);

      const wasRedirected = resp.data?.redirectedToBackup === true;
      const servedBy = resp.data?.servedBy ?? targetServerId;

      setTargetBookingResult({
        status: 'SUCCESS',
        targetedNode: targetServerId,
        servedBy,
        redirectedToBackup: wasRedirected,
        failoverReason: resp.data?.failoverReason,
        seat: uniqueSeat,
        data: resp.data
      });

      if (wasRedirected) {
        toast.success(
          `Node ${targetServerId} was OFFLINE → Auto-redirected to Backup Server (Node 4) which is now PRIMARY!`,
          { duration: 6000 }
        );
      } else {
        toast.success(`Booking successfully executed through targeted Server ${targetServerId}!`);
      }
      fetchClusterData(true);
    } catch (err: any) {
      setTargetBookingResult({
        status: 'FAILED',
        targetedNode: targetServerId,
        error: err.response?.data?.error || err.message
      });
      toast.error(err.response?.data?.error || err.message || `Targeted booking on Server ${targetServerId} failed`, { duration: 7000 });
    } finally {
      setIsTargetBookingRunning(false);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <div className="min-h-screen bg-background text-foreground pb-16">
        <Navbar />

        <main className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
                  Distributed Systems Control Plane
                </h1>
                <Badge variant="outline" className="border-primary/50 text-primary uppercase text-xs font-bold">
                  Cluster Live
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                Four Docker containers behind an Nginx load balancer on {LOAD_BALANCER_URL}. Application traffic is spread across containers 1–3. The backup container holds the replica.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchClusterData(false)}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh State
              </Button>
            </div>
          </div>

          {/* Section A: Live Distributed Nodes Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {nodes.map((node) => {
              const isOffline = node.status === 'OFFLINE';
              const isCoordinator = coordinatorId === node.nodeId;
              const isBackup = node.role === 'BACKUP';
              const isPrimary = node.isPrimary;

              return (
                <Card
                  key={node.nodeId}
                  className={`p-5 transition-all duration-300 border ${
                    isOffline
                      ? 'border-destructive/40 bg-destructive/5'
                      : isCoordinator
                      ? 'border-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/10'
                      : isPrimary
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Server className={`h-5 w-5 ${isOffline ? 'text-destructive' : 'text-primary'}`} />
                      <span className="font-bold text-lg">
                        {node.nodeId <= 3 ? `Container ${node.nodeId}` : 'Backup Container'}
                      </span>
                    </div>
                    <Badge
                      className={`${
                        isOffline
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {node.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Container:</span>
                      <span className="font-mono text-xs text-foreground">{node.hostname || '—'}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Role:</span>
                      <span className="font-semibold text-foreground">{node.role}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Port:</span>
                      <span className="font-mono text-foreground">{node.port}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Distributed Clock:</span>
                      <span className="font-mono text-xs text-foreground font-medium">
                        {node.clockTime || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Clock Offset:</span>
                      <span className="font-mono text-xs text-primary font-semibold">
                        {node.clockOffsetMs !== undefined ? `${node.clockOffsetMs > 0 ? '+' : ''}${node.clockOffsetMs}ms` : '-'}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isOffline ? 'default' : 'destructive'}
                    className="mt-4 w-full"
                    onClick={() => handleToggleFailure(node.nodeId, !isOffline)}
                  >
                    {isOffline ? `Start container ${node.nodeId}` : `Stop container ${node.nodeId}`}
                  </Button>

                  <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap gap-1.5">
                    {isPrimary && (
                      <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary border-0">
                        PRIMARY
                      </Badge>
                    )}
                    {isCoordinator && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-500 border-0">
                        COORDINATOR
                      </Badge>
                    )}
                    {isBackup && (
                      <Badge variant="secondary" className="text-[10px] bg-sky-500/20 text-sky-500 border-0">
                        REPL BACKUP
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Main Experiments Tabs */}
          <Tabs defaultValue="concurrency" className="space-y-6">
            <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-muted/60 p-1">
              <TabsTrigger value="concurrency" className="gap-2">
                <Flame className="h-4 w-4" />
                <span>Concurrency</span>
              </TabsTrigger>
              <TabsTrigger value="berkeley" className="gap-2">
                <Clock className="h-4 w-4" />
                <span>Berkeley Clock</span>
              </TabsTrigger>
              <TabsTrigger value="elections" className="gap-2">
                <Vote className="h-4 w-4" />
                <span>Elections</span>
              </TabsTrigger>
              <TabsTrigger value="replication" className="gap-2">
                <Database className="h-4 w-4" />
                <span>Fault Tolerance</span>
              </TabsTrigger>
              <TabsTrigger value="rpc" className="gap-2">
                <Radio className="h-4 w-4" />
                <span>RPC & Calls</span>
              </TabsTrigger>
              <TabsTrigger value="probing" className="gap-2">
                <Layers className="h-4 w-4" />
                <span>Target Probe</span>
              </TabsTrigger>
              <TabsTrigger value="loadbalancer" className="gap-2">
                <Scale className="h-4 w-4" />
                <span>Load Balancer</span>
              </TabsTrigger>
              <TabsTrigger value="consistency" className="gap-2">
                <GitCompare className="h-4 w-4" />
                <span>Consistency</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: CONCURRENT BOOKING EXPERIMENT */}
            <TabsContent value="concurrency">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                    <Flame className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Experiment 2: Multithreading & Concurrent Bookings</h3>
                    <p className="text-sm text-muted-foreground">
                      Simultaneously dispatch parallel customer booking requests against the same seat to verify database transaction isolation and double-booking prevention.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Show ID</label>
                    <Input
                      value={concurrentShowId}
                      onChange={(e) => setConcurrentShowId(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Target Seat (Shared Resource)</label>
                    <Input
                      value={concurrentSeat}
                      onChange={(e) => setConcurrentSeat(e.target.value)}
                      placeholder="A5"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Simultaneous Requests</label>
                    <Input
                      type="number"
                      value={concurrentRequests}
                      onChange={(e) => setConcurrentRequests(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleRunConcurrencyTest}
                      disabled={isConcurrencyRunning}
                      className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Play className="h-4 w-4" />
                      {isConcurrencyRunning ? 'Simulating...' : 'Run Concurrency Test'}
                    </Button>
                  </div>
                </div>

                {concurrencyResult && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-muted/40 p-3 rounded-lg">
                        <span className="text-xs text-muted-foreground">Total Requests</span>
                        <div className="text-xl font-bold">{concurrencyResult.totalRequests}</div>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-500 p-3 rounded-lg">
                        <span className="text-xs font-medium">Successful Bookings</span>
                        <div className="text-xl font-bold">{concurrencyResult.successful}</div>
                      </div>
                      <div className="bg-destructive/10 text-destructive p-3 rounded-lg">
                        <span className="text-xs font-medium">Seat Conflicts (Rejected)</span>
                        <div className="text-xl font-bold">{concurrencyResult.seatConflicts}</div>
                      </div>
                      <div className="bg-muted/40 p-3 rounded-lg">
                        <span className="text-xs text-muted-foreground">Execution Time</span>
                        <div className="text-xl font-bold">{concurrencyResult.executionTimeMs}ms</div>
                      </div>
                      <div className="bg-muted/40 p-3 rounded-lg">
                        <span className="text-xs text-muted-foreground">Processed Server</span>
                        <div className="text-xl font-bold">Node {concurrencyResult.processingServer}</div>
                      </div>
                    </div>

                    <h4 className="font-semibold text-sm mt-4">Transaction Stream Log:</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 font-mono text-xs bg-muted/20 p-4 rounded-lg border border-border/50">
                      {concurrencyResult.details?.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-2 rounded flex items-center justify-between ${
                            item.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {item.status === 'SUCCESS' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <span>{item.message}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{item.timeTakenMs}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* TAB 2: BERKELEY CLOCK SYNCHRONIZATION */}
            <TabsContent value="berkeley">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Experiment 3: Berkeley Clock Synchronization</h3>
                      <p className="text-sm text-muted-foreground">
                        The coordinator polls all active application servers for their local clocks, computes average difference relative to the reference, and distributes adjustment offsets.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleSyncClocks}
                    disabled={isSyncingClocks}
                    className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <RotateCcw className={`h-4 w-4 ${isSyncingClocks ? 'animate-spin' : ''}`} />
                    {isSyncingClocks ? 'Synchronizing...' : 'Run Berkeley Synchronization'}
                  </Button>
                </div>

                {/* Current Clock State Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {clocks.filter(c => c.nodeId <= 3).map((clock) => (
                    <Card key={clock.nodeId} className="p-4 bg-muted/20 border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-base">Server {clock.nodeId}</span>
                        {coordinatorId === clock.nodeId && (
                          <Badge className="bg-amber-500 text-white text-[10px]">COORDINATOR</Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm font-mono">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Distributed Clock:</span>
                          <span className="font-bold text-foreground">{clock.timeString || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Configured Offset:</span>
                          <span className="text-primary font-bold">
                            {clock.offsetMs > 0 ? `+${clock.offsetMs}ms` : `${clock.offsetMs}ms`}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {berkeleyResult && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg text-sm">
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        Berkeley Algorithm Mathematical Execution:
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Coordinator Node {berkeleyResult.coordinatorId} gathered distributed timestamps, computed the mean relative offset of <strong>{berkeleyResult.averageAdjustment}ms</strong>, and issued the following calculated adjustments:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {berkeleyResult.adjustments?.map((adj: any) => (
                        <div key={adj.nodeId} className="p-3 bg-muted/40 rounded-lg text-xs font-mono">
                          <div className="font-bold text-foreground mb-1">Server {adj.nodeId}</div>
                          <div>Initial Offset: {adj.currentOffsetMs}ms</div>
                          <div className="text-amber-500 font-semibold">Adjustment: {adj.adjustmentMs > 0 ? `+${adj.adjustmentMs}` : adj.adjustmentMs}ms</div>
                          <div className="text-emerald-500 font-bold">New Offset: {adj.newOffsetMs}ms</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="elections">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                    <Vote className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Bully and Ring Election</h3>
                    <p className="text-sm text-muted-foreground">
                      Container 1 starts the election and asks the other application containers who is reachable. The highest reachable container becomes coordinator. A stopped container is skipped.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mb-6">
                  <Button onClick={handleBullyElection} disabled={isElectionRunning} className="gap-2">
                    <Play className="h-4 w-4" />
                    {isElectionRunning ? 'Running election...' : 'Run Bully Election'}
                  </Button>
                  <Button onClick={handleRingElection} disabled={isElectionRunning} variant="outline" className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Run Ring Election
                  </Button>
                </div>
                {electionResult && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <div className="text-xs uppercase font-bold text-purple-500">{electionResult.algorithm} result</div>
                      <div className="text-xl font-extrabold">Container {electionResult.electedCoordinator} is coordinator</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Reachable: {(electionResult.activeNodes || []).join(', ') || 'none'}
                        {(electionResult.failedNodes || []).length > 0 ? ` · Unreachable: ${electionResult.failedNodes.join(', ')}` : ''}
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 font-mono text-xs bg-muted/20 p-4 rounded-lg border border-border/50">
                      {electionResult.electionMessages?.map((msg: any, idx: number) => (
                        <div key={idx} className="p-2 bg-background border border-border/60 rounded">
                          <span className="font-bold text-primary">{msg.type}</span> {msg.detail}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* TAB 4: FAULT TOLERANCE & REPLICATION */}
            <TabsContent value="replication">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-500/10 text-sky-500 rounded-lg">
                      <Database className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Experiment 5: Fault Tolerance & Primary-Backup Replication</h3>
                      <p className="text-sm text-muted-foreground">
                        Each committed booking is sent to the backup container and stored in the replicated_bookings table in Postgres.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Node Selector for failover actions */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Target Node:</label>
                      <select
                        value={failoverTargetNode}
                        onChange={(e) => setFailoverTargetNode(Number(e.target.value))}
                        className="h-8 px-2 rounded-md border border-input bg-background text-sm font-mono"
                      >
                        <option value={1}>Node 1 (Port 5000)</option>
                        <option value={2}>Node 2 (Port 5001)</option>
                        <option value={3}>Node 3 (Port 5002)</option>
                        <option value={4}>Node 4 – Backup (Port 5003)</option>
                      </select>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleToggleFailure()}
                      className="gap-2"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      {nodes.find((node) => node.nodeId === failoverTargetNode)?.status === 'OFFLINE'
                        ? `Start container ${failoverTargetNode}`
                        : `Stop container ${failoverTargetNode}`}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handlePromoteBackup}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Promote backup to primary
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="p-4 bg-muted/20">
                    <span className="text-xs text-muted-foreground">Dedicated FT Database</span>
                    <div className="text-lg font-bold text-primary mt-1 font-mono">
                      {replicationStatus?.faultToleranceDb || 'postgres'}
                    </div>
                    <Badge variant="outline" className="mt-2 text-emerald-500 border-emerald-500/40">
                      {replicationStatus?.status || 'ONLINE'}
                    </Badge>
                  </Card>

                  <Card className="p-4 bg-muted/20">
                    <span className="text-xs text-muted-foreground">Replicated Bookings Count</span>
                    <div className="text-2xl font-black text-foreground mt-1">
                      {replicationStatus?.totalReplicatedBookings || 0}
                    </div>
                    <span className="text-xs text-muted-foreground">Synced in fault-tolerance store</span>
                  </Card>

                  <Card className="p-4 bg-muted/20">
                    <span className="text-xs text-muted-foreground">Backup Server Promotion Status</span>
                    <div className="text-lg font-bold mt-1">
                      {replicationStatus?.isBackupPromoted ? (
                        <span className="text-emerald-500 font-extrabold">PROMOTED TO PRIMARY</span>
                      ) : (
                        <span className="text-muted-foreground">STANDBY REPLICA</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Failover ready</span>
                  </Card>
                </div>

                {replicationStatus?.recentReplicatedBookings?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Replicated Records in FT Database:</h4>
                    <div className="max-h-56 overflow-y-auto font-mono text-xs border border-border rounded-lg">
                      <table className="w-full text-left">
                        <thead className="bg-muted/40 border-b border-border">
                          <tr>
                            <th className="p-2.5">Source Booking #</th>
                            <th className="p-2.5">Customer ID</th>
                            <th className="p-2.5">Show ID</th>
                            <th className="p-2.5">Source Node</th>
                            <th className="p-2.5">Replicated At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {replicationStatus.recentReplicatedBookings.map((b: any) => (
                            <tr key={b.id} className="hover:bg-muted/10">
                              <td className="p-2.5 font-bold text-primary">#{b.source_booking_id}</td>
                              <td className="p-2.5">{b.customer_id}</td>
                              <td className="p-2.5">{b.show_id}</td>
                              <td className="p-2.5">Node {b.source_node_id}</td>
                              <td className="p-2.5 text-muted-foreground">{new Date(b.replicated_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* TAB 5: RPC & CLIENT-SERVER MONITOR */}
            <TabsContent value="rpc">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <Radio className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Experiment 1: Remote Procedure Calls (RPC)</h3>
                    <p className="text-sm text-muted-foreground">
                      Dispatch real server-side procedures remotely over HTTP and audit client-server execution timestamps and latency.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">RPC Method</label>
                    <select
                      value={rpcMethod}
                      onChange={(e) => setRpcMethod(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="getMovie">getMovie (Fetch movie by ID)</option>
                      <option value="getMovieShows">getMovieShows (Fetch scheduled shows)</option>
                      <option value="checkSeatAvailability">checkSeatAvailability (Inspect seat occupancy)</option>
                      <option value="calculateBookingTotal">calculateBookingTotal (Compute discounts)</option>
                      <option value="getClusterDiagnostics">getClusterDiagnostics (System health summary)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Parameter (e.g. Movie ID / Seat)</label>
                    <Input
                      value={rpcParam}
                      onChange={(e) => setRpcParam(e.target.value)}
                      placeholder="1"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={handleSendRpc}
                      disabled={isRpcLoading}
                      className="w-full gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      {isRpcLoading ? 'Invoking RPC...' : 'Send RPC Request'}
                    </Button>
                  </div>
                </div>

                {rpcResponse && (
                  <div className="mb-6 p-4 bg-muted/20 border border-border rounded-lg text-xs font-mono">
                    <div className="font-bold text-foreground mb-2 flex items-center justify-between">
                      <span>Server Response:</span>
                      <Badge variant="outline">Server {rpcResponse.serverId} • {rpcResponse.responseTime}ms</Badge>
                    </div>
                    <pre className="overflow-x-auto p-2 bg-background rounded border border-border/50">
                      {JSON.stringify(rpcResponse, null, 2)}
                    </pre>
                  </div>
                )}

                <h4 className="font-semibold text-sm mb-2">Recent Distributed Request Audit Log:</h4>
                <div className="max-h-60 overflow-y-auto font-mono text-xs border border-border rounded-lg">
                  <table className="w-full text-left">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="p-2">Timestamp</th>
                        <th className="p-2">Server</th>
                        <th className="p-2">Method</th>
                        <th className="p-2">Endpoint</th>
                        <th className="p-2">Duration</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {rpcLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-muted/10">
                          <td className="p-2 text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td className="p-2 font-bold">Node {log.serverId}</td>
                          <td className="p-2 text-primary">{log.rpcMethod || log.httpMethod}</td>
                          <td className="p-2">{log.endpoint}</td>
                          <td className="p-2">{log.durationMs}ms</td>
                          <td className="p-2">
                            <span className={log.success ? 'text-emerald-500' : 'text-destructive'}>
                              {log.statusCode}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 6: TARGET SERVER BOOKING PROBE */}
            <TabsContent value="probing">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Admin Distributed Booking Probe</h3>
                    <p className="text-sm text-muted-foreground">
                      Directly target Server 1, 2, or 3. If the targeted server is <strong>OFFLINE</strong> and the Backup Server (Node 4) has been <strong>promoted to Primary</strong>, requests are <strong>automatically redirected</strong> to Node 4 — proving transparent failover.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex gap-2">
                    {[1, 2, 3].map((sId) => (
                      <Button
                        key={sId}
                        variant={targetServerId === sId ? 'default' : 'outline'}
                        onClick={() => setTargetServerId(sId)}
                      >
                        Target Server {sId} (:500{sId - 1})
                      </Button>
                    ))}
                  </div>

                  <Button
                    onClick={handleAdminDirectBooking}
                    disabled={isTargetBookingRunning}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Play className="h-4 w-4" />
                    {isTargetBookingRunning ? 'Executing...' : `Execute Booking on Server ${targetServerId}`}
                  </Button>
                </div>

                {targetBookingResult && (
                  <div className="space-y-3">
                    {/* Failover banner */}
                    {targetBookingResult.redirectedToBackup && (
                      <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <div className="font-bold text-base mb-1">🔄 FAILOVER ACTIVE — Redirected to Backup Server</div>
                          <div><span className="font-semibold">Targeted Node:</span> Server {targetBookingResult.targetedNode} (OFFLINE)</div>
                          <div><span className="font-semibold">Actually Served By:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold">Backup Server (Node 4) — Promoted PRIMARY</span></div>
                          {targetBookingResult.failoverReason && (
                            <div className="mt-1 text-xs opacity-80">{targetBookingResult.failoverReason}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Result payload */}
                    <div className="p-4 bg-muted/20 border border-border rounded-lg text-xs font-mono">
                      <div className="flex items-center gap-2 mb-2 font-bold">
                        {targetBookingResult.status === 'SUCCESS' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <span className={targetBookingResult.status === 'SUCCESS' ? 'text-emerald-500' : 'text-destructive'}>
                          {targetBookingResult.redirectedToBackup
                            ? `Targeted Server ${targetBookingResult.targetedNode} → Served by Backup Node 4: ${targetBookingResult.status}`
                            : `Target Server ${targetBookingResult.targetedNode} Execution: ${targetBookingResult.status}`
                          }
                        </span>
                      </div>
                      <pre className="overflow-x-auto p-2 bg-background rounded border border-border/50">
                        {JSON.stringify(targetBookingResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* TAB 7: NGINX LOAD BALANCER */}
            <TabsContent value="loadbalancer">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Scale className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Nginx Load Balancer</h3>
                    <p className="text-sm text-muted-foreground">
                      Requests to {LOAD_BALANCER_URL} are round-robined across containers 1, 2, and 3. Stopping a container removes it from the rotation. The backup container receives requests only when containers 1, 2, and 3 are all stopped.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Requests to send</label>
                    <Input
                      type="number"
                      value={lbCount}
                      onChange={(e) => setLbCount(e.target.value)}
                      placeholder="9"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <Button
                      onClick={handleProbeLoadBalancer}
                      disabled={isLbRunning}
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      {isLbRunning ? 'Sending through Nginx...' : 'Send requests through the load balancer'}
                    </Button>
                  </div>
                </div>

                {lbHits.length > 0 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[1, 2, 3, 4].map((id) => (
                        <div key={id} className="bg-muted/40 p-3 rounded-lg">
                          <span className="text-xs text-muted-foreground">{id === 4 ? 'Backup' : `Container ${id}`}</span>
                          <div className="text-xl font-bold">{lbHits.filter((hit) => hit.ok && hit.nodeId === id).length}</div>
                        </div>
                      ))}
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 font-mono text-xs bg-muted/20 p-4 rounded-lg border border-border/50">
                      {lbHits.map((hit) => (
                        <div key={hit.index} className="flex items-center justify-between p-2 rounded bg-background border border-border/60">
                          <span>Request {hit.index}</span>
                          <span className={hit.ok ? 'text-emerald-500 font-semibold' : 'text-destructive'}>
                            {hit.ok ? `Container ${hit.nodeId} · ${hit.hostname}` : hit.error || 'failed'}
                          </span>
                          <span className="text-muted-foreground">{hit.ms}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* TAB 8: DATA CONSISTENCY */}
            <TabsContent value="consistency">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-sky-500/10 text-sky-500 rounded-lg">
                    <GitCompare className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Data Consistency</h3>
                    <p className="text-sm text-muted-foreground">
                      Application containers share the primary database, so they always read the same version. The backup container reads the replica. A strong write waits for the backup to acknowledge. An eventual write returns as soon as the primary commits, and the replica catches up about two seconds later.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Record key</label>
                    <Input value={consistencyKey} onChange={(e) => setConsistencyKey(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Value</label>
                    <Input value={consistencyValue} onChange={(e) => setConsistencyValue(e.target.value)} />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap items-end gap-2">
                    <Button
                      onClick={() => handleConsistencyWrite('strong')}
                      disabled={isConsistencyRunning}
                      className="gap-2"
                    >
                      Strong write
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleConsistencyWrite('eventual')}
                      disabled={isConsistencyRunning}
                    >
                      Eventual write
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleConsistencyCompare}
                      disabled={isConsistencyRunning}
                    >
                      Compare containers
                    </Button>
                  </div>
                </div>

                {consistencyResult && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex flex-wrap gap-3 text-sm">
                      <Badge className={consistencyResult.consistent ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}>
                        {consistencyResult.consistent ? 'CONSISTENT' : 'NOT YET CONSISTENT'}
                      </Badge>
                      {consistencyResult.mode && <Badge variant="outline">{consistencyResult.mode}</Badge>}
                      {consistencyResult.replication && <Badge variant="outline">{consistencyResult.replication}</Badge>}
                      <span className="text-muted-foreground">
                        Version {consistencyResult.expectedVersion ?? consistencyResult.version ?? '—'}
                        {' · '}
                        {consistencyResult.containersMatching ?? 0}/{consistencyResult.containersReached ?? 0} containers match
                        {' · '}
                        replica {consistencyResult.replicaMatches ? 'matches' : `at v${consistencyResult.replicaVersion ?? '—'}`}
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto font-mono text-xs border border-border rounded-lg">
                      <table className="w-full text-left">
                        <thead className="bg-muted/40 border-b border-border">
                          <tr>
                            <th className="p-2">Container</th>
                            <th className="p-2">Source</th>
                            <th className="p-2">Version</th>
                            <th className="p-2">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {(consistencyResult.views || []).map((view: any) => (
                            <tr key={view.nodeId}>
                              <td className="p-2">Container {view.nodeId}{view.hostname ? ` · ${view.hostname}` : ''}</td>
                              <td className="p-2">{view.source}</td>
                              <td className="p-2">{view.version ?? '—'}</td>
                              <td className="p-2">{view.value ?? view.error ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default DistributedDashboard;
