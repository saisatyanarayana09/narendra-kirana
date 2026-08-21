import os

filepath = 'S:/smart-kirana/backend/store/models.py'
with open(filepath, 'r') as f:
    content = f.read()

replacement = '''
    # Homepage Customization
    show_popular_picks = models.BooleanField(default=True)
    popular_picks_title = models.CharField(max_length=50, default="Popular picks")
    
    # Broadcast / Announcements
    broadcast_active = models.BooleanField(default=False)
    broadcast_message = models.CharField(max_length=255, blank=True, null=True, help_text="Announcement banner for customers")
'''

content = content.replace('''
    # Homepage Customization
    show_popular_picks = models.BooleanField(default=True)
    popular_picks_title = models.CharField(max_length=50, default="Popular picks")''', replacement)

with open(filepath, 'w') as f:
    f.write(content)
