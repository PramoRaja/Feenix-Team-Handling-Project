<?php
header('Content-Type: text/plain; charset=utf-8');
echo "=== FEENIX SYSTEM DIAGNOSTIC & AUTO-REPAIR ===\n";

$rootDir = __DIR__;
echo "Root Dir: $rootDir\n";
echo "Current User: " . get_current_user() . "\n\n";

// 1. Check Root Files
echo "--- Root Directory Files ---\n";
$rootFiles = scandir($rootDir);
foreach (['.next', 'public', 'server.js', 'package.json', 'feenix-logo.png', 'FeenixPortal.apk', 'patch.zip', 'static'] as $f) {
    echo "  $f : " . (in_array($f, $rootFiles) ? (is_dir($rootDir . '/' . $f) ? '[DIR]' : '[FILE ' . round(filesize($rootDir . '/' . $f)/1024, 1) . ' KB]') : '[MISSING]') . "\n";
}

// 2. Check .next Directory
echo "\n--- .next Directory Files ---\n";
$nextDir = $rootDir . '/.next';
if (is_dir($nextDir)) {
    $nextFiles = scandir($nextDir);
    foreach (['BUILD_ID', 'server', 'static', 'build-manifest.json', 'routes-manifest.json'] as $f) {
        $p = $nextDir . '/' . $f;
        echo "  .next/$f : " . (file_exists($p) ? (is_dir($p) ? '[DIR]' : '[FILE ' . round(filesize($p)/1024, 1) . ' KB]') : '[MISSING]') . "\n";
    }
} else {
    echo "  ❌ .next is NOT a directory!\n";
}

// 3. Remove conflicting legacy root/static if it exists
if (is_dir($rootDir . '/static')) {
    echo "\n⚠️ Detected conflicting root/static directory! Removing to fix Next.js deprecation error...\n";
    shell_exec("rm -rf " . escapeshellarg($rootDir . '/static'));
    echo "  ✓ Removed root/static\n";
}

// 4. Ensure .next/static exists and is populated
$nextStatic = $nextDir . '/static';
if (!is_dir($nextStatic)) {
    echo "\n❌ .next/static does NOT exist! Attempting repair...\n";
    mkdir($nextStatic, 0755, true);
    // Unzip directly from patch.zip .next/static
    if (file_exists($rootDir . '/patch.zip')) {
        echo "  Unzipping .next from patch.zip...\n";
        shell_exec("unzip -o " . escapeshellarg($rootDir . '/patch.zip') . " '.next/*' -d " . escapeshellarg($rootDir) . " 2>&1");
    }
    echo "  After repair, .next/static exists: " . (is_dir($nextStatic) ? 'YES' : 'NO') . "\n";
} else {
    echo "\n✓ .next/static exists. Subfolders:\n";
    print_r(scandir($nextStatic));
}

// 5. Ensure public files exist in root for Apache direct serving
$publicDir = $rootDir . '/public';
if (is_dir($publicDir)) {
    foreach (scandir($publicDir) as $pf) {
        if ($pf !== '.' && $pf !== '..' && $pf !== 'uploads' && is_file($publicDir . '/' . $pf)) {
            $rootDest = $rootDir . '/' . $pf;
            if (!file_exists($rootDest)) {
                copy($publicDir . '/' . $pf, $rootDest);
                echo "  Copied public/$pf to root/$pf\n";
            }
        }
    }
}

// 6. Touch restart and kill node
echo "\n--- Node Modules & Environment Inspection ---\n";
$nodeModulesPaths = [
    $rootDir . '/node_modules',
    $rootDir . '/webapp/node_modules',
    '/home/hivenzsn/nodevenv/portal.hivelankan.com/20/lib/node_modules',
    '/home/hivenzsn/nodevenv/portal.hivelankan.com/18/lib/node_modules',
];
foreach ($nodeModulesPaths as $nmp) {
    if (is_dir($nmp)) {
        echo "Found node_modules at: $nmp\n";
        $mods = scandir($nmp);
        $interesting = array_filter($mods, function($m) {
            return in_array($m, ['bcrypt', 'bcryptjs', 'mysql2', 'jsonwebtoken', 'next', 'react']);
        });
        echo "  Modules: " . implode(', ', $interesting) . "\n";
    }
}

// 7. Test DB Connection and list users
echo "\n--- DB Connection & Users ---\n";
try {
    $pdo = new PDO("mysql:host=localhost;dbname=hivenzsn_feenixdb;charset=utf8mb4", 'hivenzsn_feenixuser', 'Vishwa$#97', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 3
    ]);
    // 1. Sync Team Leaders in Team A / Team B
    $count1 = $pdo->exec("
        UPDATE employees 
        SET position = 'Digital Marketing Strategist / Team Lead' 
        WHERE (position LIKE '%Digital Marketing%' OR position LIKE '%Digital Strategist%' OR position = 'Team Lead' OR position = 'Account Manager')
          AND (is_team_leader = 1 OR is_team_leader = '1')
          AND (team = 'Team A' OR team = 'Team B')
    ");
    echo "  Updated $count1 Team Leaders to 'Digital Marketing Strategist / Team Lead'\n";

    // 2. Sync Non-Leaders to 'Digital Marketing Strategist'
    $count2 = $pdo->exec("
        UPDATE employees 
        SET position = 'Digital Marketing Strategist' 
        WHERE (position LIKE '%Digital Marketing%' OR position LIKE '%Digital Strategist%' OR position = 'Team Lead' OR position = 'Account Manager')
          AND (is_team_leader = 0 OR is_team_leader IS NULL OR is_team_leader = '' OR (team != 'Team A' AND team != 'Team B'))
    ");
    echo "  Updated $count2 Non-Leader members to 'Digital Marketing Strategist'\n";

    $stmt = $pdo->query("SELECT id, name, email, role, position, status, password, COALESCE(team, 'None') as team, COALESCE(is_team_leader, 0) as is_team_leader FROM employees ORDER BY id DESC LIMIT 15");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($users as $u) {
        $leadStr = $u['is_team_leader'] == 1 ? '👑 LEADER' : 'MEMBER';
        $passType = substr($u['password'], 0, 7);
        echo "  #{$u['id']} | {$u['name']} | Role: [{$u['role']}] | Status: [{$u['status']}] | Pass: [{$passType}...] | {$u['position']} | ({$u['email']})\n";
    }
} catch (Exception $e) {
    echo "✗ DB error: " . $e->getMessage() . "\n";
}

echo "\n=== REPAIR & DIAGNOSTIC COMPLETE ===\n";
