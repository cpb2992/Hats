import { router } from 'expo-router';
import { Button,Page,Panel,T } from '../personal/ui';
export default function AuthCallback(){return <Page tabs={false}><T display size={32}>hats.</T><Panel><T size={24} display>Back to your private life.</T><T muted>Return to Connections to check the result of your sign-in. If the app closed during authorization, start the connection again; your personal plan has not been changed.</T><Button title="Back to Connections" onPress={()=>router.replace('/settings')}/></Panel></Page>;}
