<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// 获取POST数据
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['phone']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$phone = $data['phone'];
$password = $data['password'];

// 验证手机号格式
if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid phone number']);
    exit;
}

// 读取现有用户数据
$usersFile = __DIR__ . '/users.json';
$users = json_decode(file_get_contents($usersFile), true) ?? [];

// 检查手机号是否已存在
foreach ($users as $user) {
    if ($user['phone'] === $phone) {
        http_response_code(409);
        echo json_encode(['error' => 'Phone number already exists']);
        exit;
    }
}

// 使用不可逆加密（bcrypt）加密密码
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

// 添加新用户
$users[] = [
    'phone' => $phone,
    'password' => $hashedPassword
];

// 保存到文件
if (file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT))) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save user data']);
}