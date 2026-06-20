import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  runApp(const TapTimezApp());
}

const int minTargetMs = 3000;
const int maxTargetMs = 12000;
const int perfectMs = 20;

enum AppTab { home, play, ranks }

enum PlayMode { practice, single, timekeeper }

enum RoundPhase { ready, running, result }

enum AttemptMode { practice, single, timekeeper }

class Attempt {
  const Attempt({
    required this.targetMs,
    required this.elapsedMs,
    required this.errorMs,
    required this.mode,
    required this.createdAt,
  });

  final int targetMs;
  final int elapsedMs;
  final int errorMs;
  final AttemptMode mode;
  final DateTime createdAt;
}

class AppColors {
  static const bg = Color(0xFF0A0A0F);
  static const panel = Color(0x14FFFFFF);
  static const panelStrong = Color(0x1FFFFFFF);
  static const border = Color(0x1FFFFFFF);
  static const text = Color(0xFFF5F5F7);
  static const muted = Color(0x99FFFFFF);
  static const faint = Color(0x66FFFFFF);
  static const green = Color(0xFF3EF58C);
  static const greenDark = Color(0xFF07702F);
  static const indigo = Color(0xFF6366F1);
  static const amber = Color(0xFFFBBF24);
}

class TapTimezApp extends StatefulWidget {
  const TapTimezApp({super.key});

  @override
  State<TapTimezApp> createState() => _TapTimezAppState();
}

class _TapTimezAppState extends State<TapTimezApp> {
  AppTab _tab = AppTab.home;
  PlayMode? _activeMode;
  final List<Attempt> _attempts = [];

  void _recordAttempt(Attempt attempt) {
    setState(() => _attempts.insert(0, attempt));
  }

  void _openPlay([PlayMode? mode]) {
    setState(() {
      _tab = AppTab.play;
      _activeMode = mode;
    });
  }

  void _setTab(AppTab tab) {
    setState(() {
      _tab = tab;
      _activeMode = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final activeMode = _activeMode;

    Widget body;
    if (_tab == AppTab.play && activeMode != null) {
      body = switch (activeMode) {
        PlayMode.practice => TimingRoundPage(
          title: 'Practice',
          subtitle: 'Show the clock while training, then hide it.',
          mode: AttemptMode.practice,
          showClockToggle: true,
          startsWithClockShown: true,
          onBack: () => setState(() => _activeMode = null),
          onAttempt: _recordAttempt,
        ),
        PlayMode.single => TimingRoundPage(
          title: 'Single player',
          subtitle: 'No clock. Tap start, tap stop, trust your timing.',
          mode: AttemptMode.single,
          showClockToggle: false,
          startsWithClockShown: false,
          onBack: () => setState(() => _activeMode = null),
          onAttempt: _recordAttempt,
        ),
        PlayMode.timekeeper => TimekeeperPage(
          onBack: () => setState(() => _activeMode = null),
          onAttempt: _recordAttempt,
        ),
      };
    } else {
      body = switch (_tab) {
        AppTab.home => HomePage(onPlay: () => _openPlay(PlayMode.single)),
        AppTab.play => PlayMenu(onPick: _openPlay),
        AppTab.ranks => RanksPage(attempts: _attempts),
      };
    }

    return MaterialApp(
      title: 'TapTimez',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.bg,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.green,
          brightness: Brightness.dark,
          surface: AppColors.bg,
        ),
        fontFamily: 'System',
      ),
      home: Scaffold(
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 180),
                child: KeyedSubtree(
                  key: ValueKey('${_tab.name}-${activeMode?.name ?? 'menu'}'),
                  child: body,
                ),
              ),
            ),
          ),
        ),
        bottomNavigationBar: activeMode == null
            ? BottomNavigationBar(
                currentIndex: _tab.index,
                backgroundColor: const Color(0xFF101018),
                selectedItemColor: AppColors.green,
                unselectedItemColor: AppColors.faint,
                onTap: (index) => _setTab(AppTab.values[index]),
                items: const [
                  BottomNavigationBarItem(
                    icon: Icon(Icons.home_rounded),
                    label: 'Home',
                  ),
                  BottomNavigationBarItem(
                    icon: Icon(Icons.sports_esports_rounded),
                    label: 'Play',
                  ),
                  BottomNavigationBarItem(
                    icon: Icon(Icons.leaderboard_rounded),
                    label: 'Ranks',
                  ),
                ],
              )
            : null,
      ),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key, required this.onPlay});

  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 48),
        const Text(
          'TapTimez',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 52,
            fontWeight: FontWeight.w900,
            height: 0.95,
            letterSpacing: 0,
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Predict the time. Tap to start, tap to stop, and land as close to the target as you can.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.muted, fontSize: 16, height: 1.35),
        ),
        const SizedBox(height: 42),
        TapBuzzer(label: 'PLAY', onPressed: onPlay),
        const SizedBox(height: 42),
        const _InfoStrip(
          icon: Icons.timer_off_rounded,
          title: 'No clock in ranked play',
          body:
              'The timer is measured locally on the phone using a monotonic stopwatch.',
        ),
      ],
    );
  }
}

class PlayMenu extends StatelessWidget {
  const PlayMenu({super.key, required this.onPick});

  final ValueChanged<PlayMode?> onPick;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
      children: [
        const Text(
          'Choose a mode',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 8),
        const Text(
          'Train, play blind, or use this phone as the timekeeper.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.muted),
        ),
        const SizedBox(height: 28),
        ModeTile(
          icon: Icons.visibility_rounded,
          title: 'Practice',
          body: 'Pick a target and train with the clock shown or hidden.',
          onTap: () => onPick(PlayMode.practice),
        ),
        ModeTile(
          icon: Icons.touch_app_rounded,
          title: 'Single player',
          body: 'The real challenge. No clock until your result appears.',
          onTap: () => onPick(PlayMode.single),
        ),
        ModeTile(
          icon: Icons.av_timer_rounded,
          title: 'Timekeeper',
          body: 'Run local player clocks from one phone and reveal results.',
          onTap: () => onPick(PlayMode.timekeeper),
        ),
        const SizedBox(height: 12),
        const _InfoStrip(
          icon: Icons.wifi_tethering_off_rounded,
          title: 'Online multiplayer',
          body:
              'Native Firebase rooms need Android and iOS Firebase config files before they can be wired here.',
        ),
      ],
    );
  }
}

class TimingRoundPage extends StatefulWidget {
  const TimingRoundPage({
    super.key,
    required this.title,
    required this.subtitle,
    required this.mode,
    required this.showClockToggle,
    required this.startsWithClockShown,
    required this.onBack,
    required this.onAttempt,
  });

  final String title;
  final String subtitle;
  final AttemptMode mode;
  final bool showClockToggle;
  final bool startsWithClockShown;
  final VoidCallback onBack;
  final ValueChanged<Attempt> onAttempt;

  @override
  State<TimingRoundPage> createState() => _TimingRoundPageState();
}

class _TimingRoundPageState extends State<TimingRoundPage> {
  final Stopwatch _stopwatch = Stopwatch();
  final List<Attempt> _history = [];
  Timer? _ticker;
  RoundPhase _phase = RoundPhase.ready;
  int _targetMs = 5000;
  int _elapsedMs = 0;
  int _errorMs = 0;
  bool _showClock = false;
  bool _restartReady = true;
  int _lastTapMs = 0;

  @override
  void initState() {
    super.initState();
    _showClock = widget.startsWithClockShown;
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(milliseconds: 16), (_) {
      if (mounted && _phase == RoundPhase.running) {
        setState(() => _elapsedMs = _stopwatch.elapsedMilliseconds);
      }
    });
  }

  bool _tooSoon() {
    final now = DateTime.now().millisecondsSinceEpoch;
    if (now - _lastTapMs < 350) return true;
    _lastTapMs = now;
    return false;
  }

  void _press() {
    if (_tooSoon()) return;
    if (_phase == RoundPhase.ready) {
      HapticFeedback.lightImpact();
      SystemSound.play(SystemSoundType.click);
      _stopwatch
        ..reset()
        ..start();
      setState(() {
        _phase = RoundPhase.running;
        _elapsedMs = 0;
      });
      _startTicker();
      return;
    }

    if (_phase == RoundPhase.running) {
      _stopwatch.stop();
      _ticker?.cancel();
      final elapsed = _stopwatch.elapsedMilliseconds;
      final error = (elapsed - _targetMs).abs();
      final attempt = Attempt(
        targetMs: _targetMs,
        elapsedMs: elapsed,
        errorMs: error,
        mode: widget.mode,
        createdAt: DateTime.now(),
      );
      HapticFeedback.mediumImpact();
      SystemSound.play(SystemSoundType.click);
      widget.onAttempt(attempt);
      setState(() {
        _phase = RoundPhase.result;
        _elapsedMs = elapsed;
        _errorMs = error;
        _history.insert(0, attempt);
        _restartReady = false;
      });
      Timer(const Duration(milliseconds: 900), () {
        if (mounted) setState(() => _restartReady = true);
      });
    }
  }

  void _playAgain() {
    setState(() {
      _phase = RoundPhase.ready;
      _elapsedMs = 0;
      _errorMs = 0;
      _restartReady = true;
    });
  }

  void _copyShareText() {
    final text =
        'I hit ${toSec(_elapsedMs)}s on TapTimez, only ${toSec(_errorMs)}s off ${fmtTarget(_targetMs)}.';
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Result copied')));
  }

  @override
  Widget build(BuildContext context) {
    final running = _phase == RoundPhase.running;
    final result = _phase == RoundPhase.result;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
      child: Column(
        children: [
          HeaderBar(title: widget.title, onBack: widget.onBack),
          const SizedBox(height: 18),
          Text(
            widget.subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted, height: 1.35),
          ),
          const SizedBox(height: 22),
          if (_phase == RoundPhase.ready) ...[
            const LabelText('Set your target'),
            const SizedBox(height: 10),
            TargetStepper(
              targetMs: _targetMs,
              onChanged: (value) => setState(() => _targetMs = value),
            ),
            if (widget.showClockToggle) ...[
              const SizedBox(height: 16),
              ToggleRow(
                icon: Icons.visibility_rounded,
                title: 'Show practice clock',
                value: _showClock,
                onChanged: (value) => setState(() => _showClock = value),
              ),
            ],
          ] else ...[
            const LabelText('Target'),
            const SizedBox(height: 8),
            Text(
              fmtTarget(_targetMs),
              style: const TextStyle(
                color: AppColors.green,
                fontSize: 34,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
          const Spacer(),
          ClockDisplay(
            milliseconds: _elapsedMs,
            hidden: !result && (!_showClock || !running),
          ),
          const SizedBox(height: 28),
          if (!result) ...[
            TapBuzzer(
              label: running ? 'STOP' : 'START',
              onPressed: _press,
              pulsing: !running,
            ),
            const SizedBox(height: 18),
            Text(
              running
                  ? 'Feel the time. Stop at your target.'
                  : 'Tap start, then stop at ${fmtTarget(_targetMs)}.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.faint),
            ),
          ] else ...[
            ResultPanel(
              elapsedMs: _elapsedMs,
              errorMs: _errorMs,
              onShare: _copyShareText,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _restartReady ? _playAgain : null,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(54),
                backgroundColor: AppColors.indigo,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(_restartReady ? 'Play again' : 'Read your score'),
            ),
          ],
          const Spacer(),
          if (_history.length > 1) SessionHistory(attempts: _history),
        ],
      ),
    );
  }
}

class TimekeeperPage extends StatefulWidget {
  const TimekeeperPage({
    super.key,
    required this.onBack,
    required this.onAttempt,
  });

  final VoidCallback onBack;
  final ValueChanged<Attempt> onAttempt;

  @override
  State<TimekeeperPage> createState() => _TimekeeperPageState();
}

class _TimekeeperPageState extends State<TimekeeperPage> {
  final List<PlayerClock> _players = [
    PlayerClock(name: 'Player 1'),
    PlayerClock(name: 'Player 2'),
  ];
  Timer? _ticker;
  int _targetMs = 5000;

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _ensureTicker() {
    _ticker ??= Timer.periodic(const Duration(milliseconds: 16), (_) {
      if (!mounted) return;
      if (_players.any((player) => player.stopwatch.isRunning)) {
        setState(() {});
      } else {
        _ticker?.cancel();
        _ticker = null;
      }
    });
  }

  void _addPlayer() {
    if (_players.length >= 6) return;
    setState(
      () => _players.add(PlayerClock(name: 'Player ${_players.length + 1}')),
    );
  }

  void _resetAll() {
    for (final player in _players) {
      player.reset();
    }
    setState(() {});
  }

  void _startAll() {
    HapticFeedback.lightImpact();
    for (final player in _players.where((player) => !player.finished)) {
      player.start();
    }
    _ensureTicker();
    setState(() {});
  }

  void _togglePlayer(PlayerClock player) {
    HapticFeedback.lightImpact();
    if (player.stopwatch.isRunning) {
      player.stop(_targetMs);
      widget.onAttempt(
        Attempt(
          targetMs: _targetMs,
          elapsedMs: player.elapsedMs,
          errorMs: player.errorMs,
          mode: AttemptMode.timekeeper,
          createdAt: DateTime.now(),
        ),
      );
    } else if (!player.finished) {
      player.start();
      _ensureTicker();
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final ranked = [..._players.where((player) => player.finished)]
      ..sort((a, b) => a.errorMs.compareTo(b.errorMs));

    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 24),
      children: [
        HeaderBar(title: 'Timekeeper', onBack: widget.onBack),
        const SizedBox(height: 16),
        const Text(
          'Start players from this phone, watch live clocks, and compare who lands closest.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.muted, height: 1.35),
        ),
        const SizedBox(height: 22),
        const LabelText('Target'),
        const SizedBox(height: 10),
        TargetStepper(
          targetMs: _targetMs,
          onChanged: (value) => setState(() => _targetMs = value),
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: _startAll,
                icon: const Icon(Icons.play_arrow_rounded),
                label: const Text('Start all'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.green,
                  foregroundColor: Colors.black,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _resetAll,
                icon: const Icon(Icons.replay_rounded),
                label: const Text('Reset'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        for (final player in _players)
          PlayerClockTile(
            player: player,
            targetMs: _targetMs,
            onTap: () => _togglePlayer(player),
          ),
        if (_players.length < 6)
          TextButton.icon(
            onPressed: _addPlayer,
            icon: const Icon(Icons.person_add_rounded),
            label: const Text('Add player'),
          ),
        if (ranked.isNotEmpty) ...[
          const SizedBox(height: 16),
          const LabelText('Results'),
          const SizedBox(height: 8),
          for (var i = 0; i < ranked.length; i++)
            ResultRow(
              rank: i + 1,
              name: ranked[i].name,
              errorMs: ranked[i].errorMs,
            ),
        ],
      ],
    );
  }
}

class PlayerClock {
  PlayerClock({required this.name});

  final String name;
  final Stopwatch stopwatch = Stopwatch();
  bool finished = false;
  int elapsedMs = 0;
  int errorMs = 0;

  void start() {
    stopwatch
      ..reset()
      ..start();
    finished = false;
    elapsedMs = 0;
    errorMs = 0;
  }

  void stop(int targetMs) {
    stopwatch.stop();
    elapsedMs = stopwatch.elapsedMilliseconds;
    errorMs = (elapsedMs - targetMs).abs();
    finished = true;
  }

  void reset() {
    stopwatch
      ..stop()
      ..reset();
    finished = false;
    elapsedMs = 0;
    errorMs = 0;
  }
}

class RanksPage extends StatelessWidget {
  const RanksPage({super.key, required this.attempts});

  final List<Attempt> attempts;

  @override
  Widget build(BuildContext context) {
    final ranked = attempts
        .where((attempt) => attempt.mode == AttemptMode.single)
        .toList();
    final perfects = ranked
        .where((attempt) => isPerfect(attempt.errorMs))
        .length;
    final best = ranked.isEmpty
        ? null
        : ranked.map((attempt) => attempt.errorMs).reduce(min);

    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
      children: [
        const Text(
          'Ranks',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 8),
        const Text(
          'This first mobile build tracks scores on this device session.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.muted),
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: StatCard(label: 'Perfects', value: '$perfects'),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: StatCard(
                label: 'Best error',
                value: best == null ? '--' : '${toSec(best)}s',
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        if (ranked.isEmpty)
          const EmptyState(
            icon: Icons.touch_app_rounded,
            title: 'No ranked attempts yet',
            body: 'Play single player to start building your local rank.',
          )
        else
          for (var i = 0; i < ranked.length; i++)
            AttemptRow(index: i + 1, attempt: ranked[i]),
      ],
    );
  }
}

class HeaderBar extends StatelessWidget {
  const HeaderBar({super.key, required this.title, required this.onBack});

  final String title;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          onPressed: onBack,
          icon: const Icon(Icons.arrow_back_rounded),
          tooltip: 'Back',
        ),
        Expanded(
          child: Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
          ),
        ),
        const SizedBox(width: 48),
      ],
    );
  }
}

class ModeTile extends StatelessWidget {
  const ModeTile({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String body;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppColors.panel,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: AppColors.border),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon, color: AppColors.green),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        body,
                        style: const TextStyle(
                          color: AppColors.muted,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: AppColors.faint),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class TargetStepper extends StatelessWidget {
  const TargetStepper({
    super.key,
    required this.targetMs,
    required this.onChanged,
  });

  final int targetMs;
  final ValueChanged<int> onChanged;

  void _step(int delta) {
    onChanged((targetMs + delta).clamp(minTargetMs, maxTargetMs));
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.panel,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton.filledTonal(
            onPressed: targetMs > minTargetMs ? () => _step(-1000) : null,
            icon: const Icon(Icons.remove_rounded),
          ),
          Expanded(
            child: Text(
              fmtTarget(targetMs),
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.green,
                fontSize: 36,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          IconButton.filledTonal(
            onPressed: targetMs < maxTargetMs ? () => _step(1000) : null,
            icon: const Icon(Icons.add_rounded),
          ),
        ],
      ),
    );
  }
}

class TapBuzzer extends StatefulWidget {
  const TapBuzzer({
    super.key,
    required this.label,
    this.onPressed,
    this.pulsing = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool pulsing;

  @override
  State<TapBuzzer> createState() => _TapBuzzerState();
}

class _TapBuzzerState extends State<TapBuzzer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;
  bool _pressed = false;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
      lowerBound: 0,
      upperBound: 1,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  void _down(TapDownDetails details) {
    if (widget.onPressed == null) return;
    setState(() => _pressed = true);
    widget.onPressed!();
  }

  void _up([Object? _]) {
    if (mounted) setState(() => _pressed = false);
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: widget.label,
      child: GestureDetector(
        onTapDown: _down,
        onTapUp: _up,
        onTapCancel: _up,
        child: AnimatedBuilder(
          animation: _pulse,
          builder: (context, child) {
            final glow = widget.pulsing
                ? lerpDouble(0.25, 0.56, _pulse.value)
                : 0.32;
            return AnimatedScale(
              scale: _pressed ? 0.96 : 1,
              duration: const Duration(milliseconds: 70),
              child: Container(
                width: min(MediaQuery.sizeOf(context).width * 0.62, 274),
                height: min(MediaQuery.sizeOf(context).width * 0.62, 274),
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF2B2F36),
                      Color(0xFF1A1D22),
                      Color(0xFF0C0D10),
                    ],
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black54,
                      blurRadius: 28,
                      offset: Offset(0, 14),
                    ),
                    BoxShadow(
                      color: Colors.black45,
                      blurRadius: 8,
                      offset: Offset(0, 3),
                    ),
                  ],
                ),
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: _pressed
                          ? const [
                              Colors.white,
                              Color(0xFFFFFFFF),
                              Color(0xFFE7FFF0),
                              Color(0xFF9FE9BB),
                            ]
                          : const [
                              Colors.white,
                              Color(0xFFF0FFF6),
                              Color(0xFF5FE28F),
                              Color(0xFF16A647),
                              AppColors.greenDark,
                            ],
                      stops: _pressed
                          ? const [0, 0.52, 0.74, 1]
                          : const [0, 0.27, 0.49, 0.72, 1],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.green.withValues(alpha: glow ?? 0.3),
                        blurRadius: 34,
                        spreadRadius: 2,
                      ),
                      const BoxShadow(
                        color: Colors.black45,
                        blurRadius: 6,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    widget.label,
                    style: const TextStyle(
                      color: Color(0xFF06371B),
                      fontWeight: FontWeight.w900,
                      fontSize: 26,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

double? lerpDouble(double a, double b, double t) => a + (b - a) * t;

class ClockDisplay extends StatelessWidget {
  const ClockDisplay({
    super.key,
    required this.milliseconds,
    required this.hidden,
  });

  final int milliseconds;
  final bool hidden;

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: hidden ? 0.55 : 1,
      duration: const Duration(milliseconds: 150),
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(minHeight: 78),
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFF0A120D),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.green.withValues(alpha: 0.25)),
          boxShadow: [
            BoxShadow(
              color: AppColors.green.withValues(alpha: 0.15),
              blurRadius: 18,
            ),
          ],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Text(
              '88.88',
              style: clockTextStyle(
                color: AppColors.green.withValues(alpha: 0.07),
              ),
            ),
            Text(
              hidden ? '--.--' : toSec(milliseconds),
              style: clockTextStyle(color: AppColors.green),
            ),
          ],
        ),
      ),
    );
  }
}

TextStyle clockTextStyle({required Color color}) {
  return TextStyle(
    fontFamily: 'DSEG7Classic',
    fontWeight: FontWeight.w700,
    fontSize: 38,
    color: color,
    letterSpacing: 0,
    shadows: color.a > 0.2
        ? [
            Shadow(
              color: AppColors.green.withValues(alpha: 0.45),
              blurRadius: 10,
            ),
          ]
        : null,
  );
}

class ResultPanel extends StatelessWidget {
  const ResultPanel({
    super.key,
    required this.elapsedMs,
    required this.errorMs,
    required this.onShare,
  });

  final int elapsedMs;
  final int errorMs;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPerfect(errorMs) ? AppColors.green : AppColors.border,
        ),
      ),
      child: Column(
        children: [
          Text(
            accuracyMessage(errorMs),
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(
            'Stopped at ${toSec(elapsedMs)}s, off by ${toSec(errorMs)}s',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: onShare,
            icon: const Icon(Icons.copy_rounded),
            label: const Text('Copy result'),
          ),
        ],
      ),
    );
  }
}

class SessionHistory extends StatelessWidget {
  const SessionHistory({super.key, required this.attempts});

  final List<Attempt> attempts;

  @override
  Widget build(BuildContext context) {
    final best = attempts.map((attempt) => attempt.errorMs).reduce(min);
    final perfects = attempts
        .where((attempt) => isPerfect(attempt.errorMs))
        .length;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${attempts.length} rounds - $perfects perfect - best +/-${toSec(best)}s',
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 8),
          for (final attempt in attempts.take(4))
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${toSec(attempt.elapsedMs)}s to ${fmtTarget(attempt.targetMs)}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  Text(
                    isPerfect(attempt.errorMs)
                        ? 'perfect'
                        : '+/-${toSec(attempt.errorMs)}s',
                    style: TextStyle(
                      color: isPerfect(attempt.errorMs)
                          ? AppColors.green
                          : AppColors.muted,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class ToggleRow extends StatelessWidget {
  const ToggleRow({
    super.key,
    required this.icon,
    required this.title,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String title;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.green),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          Switch(value: value, onChanged: onChanged),
        ],
      ),
    );
  }
}

class PlayerClockTile extends StatelessWidget {
  const PlayerClockTile({
    super.key,
    required this.player,
    required this.targetMs,
    required this.onTap,
  });

  final PlayerClock player;
  final int targetMs;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final running = player.stopwatch.isRunning;
    final elapsed = running
        ? player.stopwatch.elapsedMilliseconds
        : player.elapsedMs;
    final status = running
        ? 'running'
        : player.finished
        ? '+/-${toSec(player.errorMs)}s'
        : 'ready';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  player.name,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                status,
                style: const TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClockDisplay(
            milliseconds: elapsed,
            hidden: !running && !player.finished,
          ),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: onTap,
            icon: Icon(running ? Icons.stop_rounded : Icons.play_arrow_rounded),
            label: Text(running ? 'Stop clock' : 'Start clock'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(44),
              backgroundColor: running ? AppColors.amber : AppColors.green,
              foregroundColor: Colors.black,
            ),
          ),
        ],
      ),
    );
  }
}

class ResultRow extends StatelessWidget {
  const ResultRow({
    super.key,
    required this.rank,
    required this.name,
    required this.errorMs,
  });

  final int rank;
  final String name;
  final int errorMs;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: rank == 1
            ? AppColors.green.withValues(alpha: 0.10)
            : AppColors.panel,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: rank == 1
              ? AppColors.green.withValues(alpha: 0.45)
              : AppColors.border,
        ),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 28,
            child: Text(
              '#$rank',
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
          Expanded(
            child: Text(
              name,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          Text(
            '+/-${toSec(errorMs)}s',
            style: const TextStyle(color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}

class StatCard extends StatelessWidget {
  const StatCard({super.key, required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class AttemptRow extends StatelessWidget {
  const AttemptRow({super.key, required this.index, required this.attempt});

  final int index;
  final Attempt attempt;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isPerfect(attempt.errorMs)
              ? AppColors.green
              : AppColors.border,
        ),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 32,
            child: Text(
              '$index',
              style: const TextStyle(color: AppColors.muted),
            ),
          ),
          Expanded(
            child: Text(
              '${toSec(attempt.elapsedMs)}s to ${fmtTarget(attempt.targetMs)}',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          Text(
            isPerfect(attempt.errorMs)
                ? 'perfect'
                : '+/-${toSec(attempt.errorMs)}s',
            style: TextStyle(
              color: isPerfect(attempt.errorMs)
                  ? AppColors.green
                  : AppColors.muted,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 56),
      child: Column(
        children: [
          Icon(icon, color: AppColors.green, size: 48),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted, height: 1.35),
          ),
        ],
      ),
    );
  }
}

class _InfoStrip extends StatelessWidget {
  const _InfoStrip({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.green),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 3),
                Text(
                  body,
                  style: const TextStyle(color: AppColors.muted, height: 1.3),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class LabelText extends StatelessWidget {
  const LabelText(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      textAlign: TextAlign.center,
      style: const TextStyle(
        color: AppColors.faint,
        fontSize: 12,
        fontWeight: FontWeight.w800,
        letterSpacing: 2,
      ),
    );
  }
}

String toSec(num ms) => (ms / 1000).toStringAsFixed(2);

String fmtTarget(int ms) {
  final totalSec = (ms / 1000).round();
  if (totalSec < 60) return '${totalSec}s';
  final minutes = totalSec ~/ 60;
  final seconds = totalSec % 60;
  return '$minutes:${seconds.toString().padLeft(2, '0')}';
}

bool isPerfect(int errorMs) => errorMs <= perfectMs;

String accuracyMessage(int errorMs) {
  if (errorMs <= 20) return 'Perfect';
  if (errorMs <= 80) return 'So close';
  if (errorMs <= 250) return 'Nice';
  if (errorMs <= 700) return 'Not bad';
  return 'Keep practicing';
}
