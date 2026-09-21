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
  Radio
} from 'lucide-react';
import { distributedAPI, checkoutAPI } from '@/lib/api';

const DistributedDashboard = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [clocks, setClocks] = useState<any[]>([]);
  const [coordinatorId, setCoordinatorId] = useState<number>(3);
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

  // Experiment 4: Elections State
  const [electionResult, setElectionResult] = useState<any>(null);
  const [isElectionRunning, setIsElectionRunning] = useState(false);

  // Experiment 5: Admin Direct Node Test
  const [targetServerId, setTargetServerId] = useState<number>(2);
  const [isTargetBookingRunning, setIsTargetBookingRunning] = useState(false);
  const [targetBookingResult, setTargetBookingResult] = useState<any>(null);

  // Fault Tolerance: which node to target for failure/promotion
  const [failoverTargetNode, setFailoverTargetNode] = useState<number>(1);

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

  // 4. Run Bully Election
  const handleBullyElection = async () => {
    setIsElectionRunning(true);
    setElectionResult(null);
    try {
      const resp = await distributedAPI.runBullyElection();
      setElectionResult(resp.data);
      setCoordinatorId(resp.data.electedCoordinator);
      toast.success(`Bully Election complete! Node ${resp.data.electedCoordinator} elected Coordinator.`);
      fetchClusterData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Bully Election failed');
    } finally {
      setIsElectionRunning(false);
    }
  };

  // 5. Run Ring Election
  const handleRingElection = async () => {
    setIsElectionRunning(true);
    setElectionResult(null);
    try {
      const resp = await distributedAPI.runRingElection();
      setElectionResult(resp.data);
      setCoordinatorId(resp.data.electedCoordinator);
      toast.success(`Ring Election complete! Token circulated, Node ${resp.data.electedCoordinator} elected.`);
      fetchClusterData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Ring Election failed');
    } finally {
      setIsElectionRunning(false);
    }
  };

  // 6. Simulate Server Failure / Failover
  const handleToggleFailure = async () => {
    try {
      const resp = await distributedAPI.simulateFailure(failoverTargetNode);
      toast.info(`Node ${failoverTargetNode} state → ${resp.data.status}`);
      fetchClusterData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle failure');
    }
  };

  // 7. Promote Backup Server to Primary
  const handlePromoteBackup = async () => {
    try {
      const resp = await distributedAPI.promoteBackup(failoverTargetNode);
      toast.success(resp.data.message || `Node ${failoverTargetNode} promoted to Primary!`);
      fetchClusterData(true);
    } catch (err: any) {
      toast.error(err.message || 'Backup promotion failed');
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

      setTargetBookingResult({
        status: 'SUCCESS',
        targetedNode: targetServerId,
        seat: uniqueSeat,
        data: resp.data
      });
      toast.success(`Booking successfully executed through targeted Server ${targetServerId}!`);
      fetchClusterData(true);
    } catch (err: any) {
      setTargetBookingResult({
        status: 'FAILED',
        targetedNode: targetServerId,
        error: err.response?.data?.error || err.message
      });
      toast.error(`Targeted booking on Server ${targetServerId} failed`);
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
                Real-time management for MovieBook 4-node cluster (3 Active Application Servers + 1 Backup Server)
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
                        {node.nodeId <= 3 ? `Server ${node.nodeId}` : 'Backup Server'}
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
            <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 bg-muted/60 p-1">
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

            {/* TAB 3: LEADER ELECTION (BULLY & RING) */}
            <TabsContent value="elections">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                    <Vote className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Experiment 4: Election Algorithms (Bully & Ring)</h3>
                    <p className="text-sm text-muted-foreground">
                      Elect a cluster coordinator among active servers. Bully algorithm uses highest-ID dominance; Ring algorithm circulates an election token around the logical topology.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mb-6">
                  <Button
                    onClick={handleBullyElection}
                    disabled={isElectionRunning}
                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Play className="h-4 w-4" />
                    Run Bully Election
                  </Button>
                  <Button
                    onClick={handleRingElection}
                    disabled={isElectionRunning}
                    variant="outline"
                    className="gap-2 border-purple-500/40 text-purple-500 hover:bg-purple-500/10"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Run Ring Election
                  </Button>
                </div>

                {electionResult && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <div>
                        <span className="text-xs uppercase font-bold text-purple-500">
                          {electionResult.algorithm} Election Victor
                        </span>
                        <div className="text-xl font-extrabold text-foreground">
                          Server {electionResult.electedCoordinator} Elected Coordinator
                        </div>
                      </div>
                      <Badge className="bg-purple-600 text-white text-sm px-3 py-1">
                        Active Coordinator: Node {electionResult.electedCoordinator}
                      </Badge>
                    </div>

                    <h4 className="font-semibold text-sm">Message Flow Protocol:</h4>
                    <div className="max-h-64 overflow-y-auto space-y-2 font-mono text-xs bg-muted/20 p-4 rounded-lg border border-border/50">
                      {electionResult.electionMessages?.map((msg: any, idx: number) => (
                        <div key={idx} className="p-2 bg-background border border-border/60 rounded">
                          <div className="flex items-center gap-2 font-bold text-primary">
                            <span className="px-1.5 py-0.5 bg-primary/10 rounded text-[10px]">
                              {msg.type}
                            </span>
                            <span>{msg.detail}</span>
                          </div>
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
                        Demonstrates live state replication to dedicated Backup Server (Node 4) and the independent <code className="text-primary font-bold">moviebooking_fault_tolerance</code> database.
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
                      onClick={handleToggleFailure}
                      className="gap-2"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Simulate Node {failoverTargetNode} Failure
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handlePromoteBackup}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Promote Node {failoverTargetNode} to Primary
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="p-4 bg-muted/20">
                    <span className="text-xs text-muted-foreground">Dedicated FT Database</span>
                    <div className="text-lg font-bold text-primary mt-1 font-mono">
                      {replicationStatus?.faultToleranceDb || 'moviebooking_fault_tolerance'}
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
                      Directly target a specific application server (Server 1, Server 2, or Server 3) to prove that all active nodes process genuine MovieBook bookings and replicate them to the Backup server.
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
                  <div className="p-4 bg-muted/20 border border-border rounded-lg text-xs font-mono">
                    <div className="flex items-center gap-2 mb-2 font-bold">
                      {targetBookingResult.status === 'SUCCESS' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      <span className={targetBookingResult.status === 'SUCCESS' ? 'text-emerald-500' : 'text-destructive'}>
                        Target Server {targetBookingResult.targetedNode} Execution: {targetBookingResult.status}
                      </span>
                    </div>
                    <pre className="overflow-x-auto p-2 bg-background rounded border border-border/50">
                      {JSON.stringify(targetBookingResult, null, 2)}
                    </pre>
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
