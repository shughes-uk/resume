# django signals
# https://docs.djangoproject.com/en/3.2/topics/signals/
from allauth.account.signals import user_signed_up
from allauth.socialaccount.models import SocialLogin
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from api.models.user import ProfileModel


@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        ProfileModel.objects.create(user=instance)


@receiver([user_signed_up])
def social_account_added_callback(request, sociallogin: SocialLogin, **kwargs):
    if sociallogin.account.provider == "github":
        user_profile = sociallogin.user.profile
        user_profile.avatar_url = sociallogin.account.extra_data.get("avatar_url")
        user_profile.save()
    elif sociallogin.account.provider == "google":
        user_profile = sociallogin.user.profile
        user_profile.avatar_url = sociallogin.account.extra_data.get("picture")
        user_profile.save()
