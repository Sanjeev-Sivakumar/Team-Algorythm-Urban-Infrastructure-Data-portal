module.exports = function (allowedRoles) {
    return function (req, res, next) {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: "Access Denied: No role found" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access Denied: ${req.user.role} role not authorized` 
            });
        }

        next();
    };
};
