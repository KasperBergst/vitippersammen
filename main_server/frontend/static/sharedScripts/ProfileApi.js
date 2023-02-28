export default class ProfileApi{
    static async changeEmail(email){
        return fetch(`/api/user/changeEmail`, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "email": email
            })
        });
    }

    static async changePassword(oldPassword, newPassword){
        return fetch(`/api/user/changePassword`, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "oldPassword": oldPassword,
                "newPassword": newPassword
            })
        });
    }
}