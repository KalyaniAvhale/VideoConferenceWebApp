from django.db import models

# Create your models here.
'''Create DB model  & store user name , uid
on join create roommrnber in db
'''
class RoomMember(models.Model):
    name = models.CharField(max_length=200)
    uid = models.CharField(max_length=1000)
    room_name = models.CharField(max_length=200)
    insession = models.BooleanField(default=True)

    def __str__(self):
        return self.name