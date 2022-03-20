from django.http import JsonResponse
from django.shortcuts import render,redirect
from agora_token_builder import RtcTokenBuilder
import random,time,json
from . models import RoomMember
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.core.mail import send_mail, EmailMessage
from django.contrib.sites.shortcuts import get_current_site
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode 
from django.utils.encoding import force_bytes, force_str
from videochat import settings
from . tokens import generate_token
from django.urls import reverse

# Create your views here.

#Home page
def home(request):
    return render(request, 'signin.html')



#signup action
def signup(request):

    #validate inputs 
    if request.method == "POST":
        username = request.POST.get('user_name')
        email = request.POST['email']
        pass1 = request.POST['pass']
        pass2 = request.POST['re_pass']

        if User.objects.filter(username=username):
            messages.error(request,"Username already taken !")
            return redirect('home')

        if User.objects.filter(email=email):
            messages.error(request,"Email already registered !")
            return redirect('home')

        if len(username)>10:
            messages.error(request,"Username must be under 10 characters")
            

        if pass1 != pass2:
            messages.error(request,"Passwords didn't match!!")
            
        
        if not username.isalnum():
            messages.error(request,"Username must be alpha numeric !! ")
            return redirect('home')


        #save user details
        myuser = User.objects.create_user(username, email, pass1)
        myuser.is_active = False
        myuser.save()
 
        messages.success(request, "Account confirmation Link sent to  your "+email+" email")

        
       
        #send email with activation link Email Confirmation 
        current_site = get_current_site(request)
        email_subject = "Confirm your email"
        message = render_to_string('email_confirmation.html',{
            'name':myuser.username,
            'domain' : current_site.domain,
            'uid' : urlsafe_base64_encode(force_bytes(myuser.pk)),
            'token' : generate_token.make_token(myuser)
        })

        email = EmailMessage(email_subject, message, settings.EMAIL_HOST_USER, [myuser.email],)
        email.fail_silently = True
        email.send()

        return redirect('signin')  

    return render(request,"signup.html")

#signin action
def signin(request):

    if request.method == 'POST':
        username = request.POST['username']
        pass1 = request.POST['pass1']

        user = authenticate(username = username, password = pass1)

        if user is not None:
            login(request, user)
            
            return render(request, 'lobby.html',{'name':username})
        else:
            messages.error(request,'Bad Credentials')
            return redirect('home')

    return render(request, 'signin.html')



def activate(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        myuser = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        myuser = None
    
    if myuser is not None and generate_token.check_token(myuser, token):
        myuser.is_active = True
        myuser.save()
        login(request, myuser)
        return redirect('home')
    else:
        return render(request, 'activation_failed.html')




def lobby(request):
    return render(request,"lobby.html")

def room(request):
    return render(request,"room.html")


#Build token with uid
def getToken(request):
    appId = '1ef2db917fad45528ea02901ecda38ee'
    appCertificate ='85c35547310f4e8abc31cdacb2029534'
    channelName = request.GET.get('channel')
    uid = random.randint(1,230)
    expirationTimeInSeconds = 3600 * 48
    currenTimeStamp = time.time()
    privilegeExpiredTs = currenTimeStamp + expirationTimeInSeconds
    role = 1

    token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs)
    return JsonResponse({'token':token, 'uid':uid ,'safe':False})





@csrf_exempt
def createUser(request):
    data = json.load(request.body)
    member , created = RoomMember.objects.get_or_created(
        name = data['name'],
        uid = data['UID'],
        room_name = data['room_name']

    )
    return  JsonResponse({'name':data['name']},safe=False)



@csrf_exempt
def createMember(request):
    data = json.loads(request.body)
    member, created = RoomMember.objects.get_or_create(
        name=data['name'],
        uid=data['UID'],
        room_name=data['room_name']
    )

    return JsonResponse({'name':data['name']}, safe=False)

def getMember(request):
    uid = request.GET.get('UID')
    room_name = request.GET.get('room_name')

    member = RoomMember.objects.get(
        uid=uid,
        room_name=room_name,
    )
    name = member.name
    return JsonResponse({'name':member.name}, safe=False)

@csrf_exempt
def deleteMember(request):
    data = json.loads(request.body)
    member = RoomMember.objects.get(
        name=data['name'],
        uid=data['UID'],
        room_name=data['room_name']
    )
    member.delete()
    return JsonResponse('Member deleted', safe=False)


def log_out(request):
    logout(request)
    messages.success(request,"Logged Out Successfully")
    return redirect('home')