export class ResponseUtil {
    // 成功响应
    static success(data, message = '操作成功') {
        return {
            success: true,
            code: 200,
            message,
            data,
            timestamp: new Date().toISOString()
        };
    }
    // 错误响应
    static error(code, message, data = null) {
        return {
            success: false,
            code,
            message,
            data: data,
            timestamp: new Date().toISOString()
        };
    }
    // 常见错误码
    static badRequest(message = '请求参数错误') {
        return this.error(400, message);
    }
    static unauthorized(message = '未授权') {
        return this.error(401, message);
    }
    static forbidden(message = '无权限') {
        return this.error(403, message);
    }
    static notFound(message = '资源不存在') {
        return this.error(404, message);
    }
    static conflict(message = '资源冲突') {
        return this.error(409, message);
    }
    static internalError(message = '服务器内部错误') {
        return this.error(500, message);
    }
}
