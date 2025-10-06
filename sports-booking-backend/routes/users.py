from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User

users_bp = Blueprint('users', __name__)

def require_admin():
    user_id = int(get_jwt_identity())  # Convert to int
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return None
    return user

@users_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    user = require_admin()
    if not user:
        return jsonify({'error': 'Admin access required'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '', type=str)
    
    query = User.query
    
    if search:
        query = query.filter(
            db.or_(
                User.name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
        )
    
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'users': [u.to_dict() for u in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }), 200

@users_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def update_user_role(user_id):
    admin = require_admin()
    if not admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    if not data or 'role' not in data:
        return jsonify({'error': 'Role field required'}), 400
    
    new_role = data['role']
    if new_role not in ['admin', 'manager', 'member', 'viewer']:
        return jsonify({'error': 'Invalid role'}), 400
    
    target_user.role = new_role
    db.session.commit()
    
    return jsonify(target_user.to_dict()), 200