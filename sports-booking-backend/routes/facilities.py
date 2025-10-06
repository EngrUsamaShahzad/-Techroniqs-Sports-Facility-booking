from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Facility
from datetime import datetime

facilities_bp = Blueprint('facilities', __name__)

def require_admin():
    user_id = int(get_jwt_identity())  # Convert to int
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return None
    return user

@facilities_bp.route('/facilities', methods=['GET'])
@jwt_required()
def get_facilities():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '', type=str)
    
    query = Facility.query
    
    if search:
        query = query.filter(Facility.name.ilike(f'%{search}%'))
    
    pagination = query.order_by(Facility.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'facilities': [f.to_dict() for f in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }), 200

@facilities_bp.route('/facilities/<int:facility_id>', methods=['GET'])
@jwt_required()
def get_facility(facility_id):
    facility = Facility.query.get(facility_id)
    if not facility:
        return jsonify({'error': 'Facility not found'}), 404
    
    return jsonify(facility.to_dict()), 200

@facilities_bp.route('/facilities', methods=['POST'])
@jwt_required()
def create_facility():
    user = require_admin()
    if not user:
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    
    if not data or not all(k in data for k in ['name', 'type', 'open_from', 'open_to']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if data['type'] not in ['court', 'track', 'pool', 'gym']:
        return jsonify({'error': 'Invalid facility type'}), 400
    
    try:
        open_from = datetime.strptime(data['open_from'], '%H:%M').time()
        open_to = datetime.strptime(data['open_to'], '%H:%M').time()
    except ValueError:
        return jsonify({'error': 'Invalid time format. Use HH:MM'}), 400
    
    facility = Facility(
        name=data['name'],
        type=data['type'],
        open_from=open_from,
        open_to=open_to
    )
    
    db.session.add(facility)
    db.session.commit()
    
    return jsonify(facility.to_dict()), 201

@facilities_bp.route('/facilities/<int:facility_id>', methods=['PUT'])
@jwt_required()
def update_facility(facility_id):
    user = require_admin()
    if not user:
        return jsonify({'error': 'Admin access required'}), 403
    
    facility = Facility.query.get(facility_id)
    if not facility:
        return jsonify({'error': 'Facility not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        facility.name = data['name']
    
    if 'type' in data:
        if data['type'] not in ['court', 'track', 'pool', 'gym']:
            return jsonify({'error': 'Invalid facility type'}), 400
        facility.type = data['type']
    
    if 'open_from' in data:
        try:
            facility.open_from = datetime.strptime(data['open_from'], '%H:%M').time()
        except ValueError:
            return jsonify({'error': 'Invalid time format for open_from'}), 400
    
    if 'open_to' in data:
        try:
            facility.open_to = datetime.strptime(data['open_to'], '%H:%M').time()
        except ValueError:
            return jsonify({'error': 'Invalid time format for open_to'}), 400
    
    db.session.commit()
    
    return jsonify(facility.to_dict()), 200

@facilities_bp.route('/facilities/<int:facility_id>', methods=['DELETE'])
@jwt_required()
def delete_facility(facility_id):
    user = require_admin()
    if not user:
        return jsonify({'error': 'Admin access required'}), 403
    
    facility = Facility.query.get(facility_id)
    if not facility:
        return jsonify({'error': 'Facility not found'}), 404
    
    db.session.delete(facility)
    db.session.commit()
    
    return jsonify({'message': 'Facility deleted successfully'}), 200