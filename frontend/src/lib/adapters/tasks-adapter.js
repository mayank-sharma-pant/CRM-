import api from '../api/api';

// ============================
// Tasks Adapter
// ============================

export async function getTasks({ status, skip = 0, limit = 100 } = {}) {
    const params = { skip, limit };
    if (status) params.status = status;
    const res = await api.get('/api/tasks/', { params });
    return res.data;
}

export async function getTask(id) {
    const res = await api.get(`/api/tasks/${id}`);
    return res.data;
}

export async function getPriorityTasks() {
    const res = await api.get('/api/tasks/priority');
    return res.data;
}

export async function createTask(taskData) {
    const res = await api.post('/api/tasks/', taskData);
    return res.data;
}

export async function updateTask(id, taskData) {
    const res = await api.put(`/api/tasks/${id}`, taskData);
    return res.data;
}

export async function completeTask(id) {
    const res = await api.post(`/api/tasks/${id}/complete`);
    return res.data;
}

export async function deleteTask(id) {
    const res = await api.delete(`/api/tasks/${id}`);
    return res.data;
}
