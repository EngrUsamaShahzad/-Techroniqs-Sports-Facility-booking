from app import app
from models import db, User, Facility
from datetime import time

def init_database():
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        
        print("Creating all tables...")
        db.create_all()
        
        # Create default users
        admin = User(name='Admin User', email='admin@example.com', role='admin')
        admin.set_password('admin123')
        db.session.add(admin)
        
        manager = User(name='Manager User', email='manager@example.com', role='manager')
        manager.set_password('manager123')
        db.session.add(manager)
        
        member1 = User(name='John Doe', email='john@example.com', role='member')
        member1.set_password('member123')
        db.session.add(member1)
        
        member2 = User(name='Jane Smith', email='jane@example.com', role='member')
        member2.set_password('member123')
        db.session.add(member2)
        
        viewer = User(name='Viewer User', email='viewer@example.com', role='viewer')
        viewer.set_password('viewer123')
        db.session.add(viewer)
        
        # Create sample facilities
        facilities = [
            Facility(name='Basketball Court A', type='court', open_from=time(6, 0), open_to=time(22, 0)),
            Facility(name='Tennis Court 1', type='court', open_from=time(7, 0), open_to=time(21, 0)),
            Facility(name='Swimming Pool', type='pool', open_from=time(6, 0), open_to=time(20, 0)),
            Facility(name='Running Track', type='track', open_from=time(5, 0), open_to=time(23, 0)),
            Facility(name='Fitness Gym', type='gym', open_from=time(6, 0), open_to=time(22, 0))
        ]
        
        for facility in facilities:
            db.session.add(facility)
        
        db.session.commit()
        
        print("\n✅ Database initialized successfully!")
        print("\n=== Default Users ===")
        print("Admin: admin@example.com / admin123")
        print("Manager: manager@example.com / manager123")
        print("Member: john@example.com / member123")
        print("Member: jane@example.com / member123")
        print("Viewer: viewer@example.com / viewer123")
        print("\n5 sample facilities created")

if __name__ == '__main__':
    init_database()