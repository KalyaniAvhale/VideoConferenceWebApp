from django.urls import path
from . import views
urlpatterns = [

    path('',views.signin, name='home'),
    path('signin/',views.signin,name="signin"),
    path('signup/',views.signup,name="signup"),
    path('lobby/',views.lobby,name="lobby"),
    path('room/',views.room),
    path('activate/<uidb64>/<token>', views.activate, name="activate"),
    path('get_token/',views.getToken),
    path('create_member/',views.createMember),
    path('get_member/',views.getMember),
    path('delete_member/',views.deleteMember),
    path('logout', views.log_out, name="logout"),
    
]