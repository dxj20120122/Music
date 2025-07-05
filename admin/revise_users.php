<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// 获取POST数据
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['phone']) || !isset($data['level']) || !isset($data['expiry_days'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$phone = $data['phone'];
$level = $data['level'];
$expiryDays = intval($data['expiry_days']);

// 验证到期天数
if ($expiryDays <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid expiry days']);
    exit;
}

// 验证等级值
if (!in_array($level, ['normal', 'vip', 'diamond'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid level']);
    exit;
}

// 读取现有用户数据
$usersFile = __DIR__ . '/users.json';
$users = json_decode(file_get_contents($usersFile), true) ?? [];

// 查找并更新用户等级
$userFound = false;
foreach ($users as &$user) {
    if ($user['phone'] === $phone) {
        $user['level'] = $level;
        $user['expiry_date'] = date('Y-m-d H:i:s', strtotime("+{$expiryDays} days"));
        $userFound = true;
        break;
    }
}

if (!$userFound) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

// 保存到文件
if (file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT))) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save user data']);
}