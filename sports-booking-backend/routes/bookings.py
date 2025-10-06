from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Facility, Booking
from datetime import datetime, timedelta, time

bookings_bp = Blueprint('bookings', __name__)

def check_slot_availability(facility_id, start_utc, end_utc, exclude_booking_id=None):
    query = Booking.query.filter(
        Booking.facility_id == facility_id,
        Booking.start_utc < end_utc,
        Booking.end_utc > start_utc
    )
    
    if exclude_booking_id:
        query = query.filter(Booking.id != exclude_booking_id)
    
    return query.first() is None

def validate_booking_time(facility, start_utc, end_utc):
    duration = (end_utc - start_utc).total_seconds() / 60
    if duration != 30:
        return False, 'Booking must be exactly 30 minutes'
    
    start_time = start_utc.time()
    end_time = end_utc.time()
    
    if start_time < facility.open_from or end_time > facility.open_to:
        return False, f'Booking must be within facility hours ({facility.open_from} - {facility.open_to})'
    
    return True, None

@bookings_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_bookings():
    user_id = int(get_jwt_identity())  # Convert to int
    user = User.query.get(user_id)
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    facility_id = request.args.get('facility_id', type=int)
    my_bookings = request.args.get('my_bookings', 'false').lower() == 'true'
    
    query = Booking.query
    
    if my_bookings or user.role == 'member':
        query = query.filter(Booking.user_id == user_id)
    
    if facility_id:
        query = query.filter(Booking.facility_id == facility_id)
    
    pagination = query.order_by(Booking.start_utc.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'bookings': [b.to_dict() for b in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }), 200

@bookings_bp.route('/bookings/facility/<int:facility_id>/slots', methods=['GET'])
@jwt_required()
def get_facility_slots(facility_id):
    facility = Facility.query.get(facility_id)
    if not facility:
        return jsonify({'error': 'Facility not found'}), 404
    
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'Date parameter required (YYYY-MM-DD)'}), 400
    
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    start_of_day = datetime.combine(target_date, time.min)
    end_of_day = datetime.combine(target_date, time.max)
    
    bookings = Booking.query.filter(
        Booking.facility_id == facility_id,
        Booking.start_utc >= start_of_day,
        Booking.start_utc < end_of_day
    ).all()
    
    return jsonify({
        'facility': facility.to_dict(),
        'date': date_str,
        'bookings': [b.to_dict() for b in bookings]
    }), 200

@bookings_bp.route('/bookings', methods=['POST'])
@jwt_required()
def create_booking():
    user_id = int(get_jwt_identity())  # Convert to int
    user = User.query.get(user_id)
    
    if user.role == 'viewer':
        return jsonify({'error': 'Viewers cannot create bookings'}), 403
    
    data = request.get_json()
    
    if not data or not all(k in data for k in ['facility_id', 'start_utc', 'end_utc']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    facility = Facility.query.get(data['facility_id'])
    if not facility:
        return jsonify({'error': 'Facility not found'}), 404
    
    try:
        start_utc = datetime.fromisoformat(data['start_utc'].replace('Z', '+00:00'))
        end_utc = datetime.fromisoformat(data['end_utc'].replace('Z', '+00:00'))
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400
    
    valid, error = validate_booking_time(facility, start_utc, end_utc)
    if not valid:
        return jsonify({'error': error}), 400
    
    if not check_slot_availability(facility.id, start_utc, end_utc):
        return jsonify({'error': 'Time slot is already booked'}), 409
    
    booking = Booking(
        user_id=user_id,
        facility_id=data['facility_id'],
        start_utc=start_utc,
        end_utc=end_utc,
        note=data.get('note', '')
    )
    
    db.session.add(booking)
    db.session.commit()
    
    return jsonify(booking.to_dict()), 201

@bookings_bp.route('/bookings/<int:booking_id>', methods=['DELETE'])
@jwt_required()
def cancel_booking(booking_id):
    user_id = int(get_jwt_identity())  # Convert to int
    user = User.query.get(user_id)
    
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    
    if user.role == 'member':
        if booking.user_id != user_id:
            return jsonify({'error': 'You can only cancel your own bookings'}), 403
        
        time_until_start = (booking.start_utc - datetime.utcnow()).total_seconds() / 3600
        if time_until_start < 1:
            return jsonify({'error': 'Cannot cancel booking less than 1 hour before start time'}), 400
    
    elif user.role == 'viewer':
        return jsonify({'error': 'Viewers cannot cancel bookings'}), 403
    
    db.session.delete(booking)
    db.session.commit()
    
    return jsonify({'message': 'Booking cancelled successfully'}), 200