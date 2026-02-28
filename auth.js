// Управление пользователями
function getUsers() {
    return JSON.parse(localStorage.getItem('defor_users')) || [];
}

function saveUsers(users) {
    localStorage.setItem('defor_users', JSON.stringify(users));
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('defor_current_user'));
}

function setCurrentUser(user) {
    localStorage.setItem('defor_current_user', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('defor_current_user');
    window.location.href = 'index.html';
}

function register(phone, password) {
    const users = getUsers();
    
    if (users.find(u => u.phone === phone)) {
        return { success: false, message: 'Этот номер уже зарегистрирован' };
    }
    
    const newUser = {
        id: 'USER-' + Date.now(),
        phone: phone,
        password: password,
        registeredAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);
    
    return { success: true };
}

function login(phone, password) {
    const users = getUsers();
    const user = users.find(u => u.phone === phone && u.password === password);
    
    if (user) {
        setCurrentUser(user);
        return { success: true };
    }
    
    return { success: false, message: 'Неверный номер или пароль' };
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}